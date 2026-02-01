/**
 * Recall.ai Webhook Receiver
 * Handles callbacks from Recall.ai for meeting bot status updates,
 * transcriptions, and recording completion
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-recall-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('[Recall Webhook] Received:', JSON.stringify(payload, null, 2));

    const { event, data } = payload;
    const botId = data?.bot_id || data?.id;
    const metadata = data?.metadata || {};
    const sessionId = metadata?.session_id;

    if (!sessionId && !botId) {
      console.log('[Recall Webhook] No session or bot ID found, skipping');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find session by bot_session_id if sessionId not in metadata
    let targetSessionId = sessionId;
    if (!targetSessionId && botId) {
      const { data: session } = await supabase
        .from('external_meeting_sessions')
        .select('id')
        .eq('bot_session_id', botId)
        .maybeSingle();
      
      if (session) {
        targetSessionId = session.id;
      }
    }

    if (!targetSessionId) {
      console.log('[Recall Webhook] Could not find session for bot:', botId);
      return new Response(JSON.stringify({ received: true, warning: 'Session not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle different event types
    switch (event) {
      case 'bot.status_change':
        await handleBotStatusChange(supabase, targetSessionId, data);
        break;
      
      case 'bot.transcription':
        await handleTranscription(supabase, targetSessionId, data);
        break;
      
      case 'bot.media_output_ready':
        await handleMediaReady(supabase, targetSessionId, data);
        break;
      
      case 'call.ended':
        await handleCallEnded(supabase, targetSessionId, data);
        break;
      
      default:
        console.log('[Recall Webhook] Unhandled event type:', event);
    }

    return new Response(JSON.stringify({ received: true, event }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Recall Webhook] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleBotStatusChange(supabase: any, sessionId: string, data: any) {
  const status = data.status?.code || data.status;
  
  const statusMap: Record<string, string> = {
    'joining_call': 'bot_joining',
    'in_waiting_room': 'bot_joining',
    'in_call_not_recording': 'in_meeting',
    'in_call_recording': 'recording',
    'call_ended': 'processing',
    'done': 'completed',
    'fatal': 'failed',
    'analysis_done': 'completed',
  };

  const mappedStatus = statusMap[status] || status;

  await supabase
    .from('external_meeting_sessions')
    .update({
      status: mappedStatus,
      updated_at: new Date().toISOString(),
      metadata: supabase.sql`metadata || ${JSON.stringify({ last_status_update: status, status_updated_at: new Date().toISOString() })}::jsonb`
    })
    .eq('id', sessionId);

  console.log(`[Recall Webhook] Updated session ${sessionId} status to: ${mappedStatus}`);
}

async function handleTranscription(supabase: any, sessionId: string, data: any) {
  const transcript = data.transcript || data.text;
  const words = data.words || [];
  
  // Append to session transcript
  const { data: session } = await supabase
    .from('external_meeting_sessions')
    .select('transcript_chunks')
    .eq('id', sessionId)
    .single();

  const existingChunks = session?.transcript_chunks || [];
  existingChunks.push({
    text: transcript,
    words,
    speaker: data.speaker,
    timestamp: data.timestamp || new Date().toISOString(),
  });

  await supabase
    .from('external_meeting_sessions')
    .update({
      transcript_chunks: existingChunks,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  console.log(`[Recall Webhook] Added transcript chunk to session ${sessionId}`);
}

async function handleMediaReady(supabase: any, sessionId: string, data: any) {
  const recordingUrl = data.url || data.download_url;
  
  if (!recordingUrl) {
    console.log('[Recall Webhook] No recording URL in media_output_ready');
    return;
  }

  // Get session details
  const { data: session } = await supabase
    .from('external_meeting_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session) return;

  // Compile transcript from chunks
  const transcriptChunks = session.transcript_chunks || [];
  const fullTranscript = transcriptChunks
    .map((chunk: any) => `[${chunk.speaker || 'Speaker'}]: ${chunk.text}`)
    .join('\n');

  // Calculate duration
  const durationSeconds = data.duration_seconds || 
    (session.bot_leave_time && session.bot_join_time 
      ? Math.round((new Date(session.bot_leave_time).getTime() - new Date(session.bot_join_time).getTime()) / 1000)
      : 0);

  // Create meeting recording record
  const { data: recording, error: recordingError } = await supabase
    .from('meeting_recordings_extended')
    .insert({
      user_id: session.user_id,
      title: session.meeting_title || 'External Meeting Recording',
      recording_url: recordingUrl,
      duration_seconds: durationSeconds,
      transcript: fullTranscript,
      source_type: 'external',
      processing_status: 'pending',
      participants: extractParticipants(transcriptChunks),
      metadata: {
        platform: session.platform,
        external_session_id: sessionId,
        recall_bot_id: session.bot_session_id,
        original_meeting_url: session.meeting_url,
      }
    })
    .select()
    .single();

  if (recordingError) {
    console.error('[Recall Webhook] Failed to create recording:', recordingError);
    return;
  }

  // Update session with recording reference
  await supabase
    .from('external_meeting_sessions')
    .update({
      status: 'completed',
      recording_id: recording.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  // Trigger analysis pipeline
  try {
    await supabase.functions.invoke('analyze-meeting-recording-advanced', {
      body: { recordingId: recording.id }
    });
    console.log(`[Recall Webhook] Triggered analysis for recording ${recording.id}`);
  } catch (analysisError) {
    console.error('[Recall Webhook] Failed to trigger analysis:', analysisError);
  }

  console.log(`[Recall Webhook] Created recording ${recording.id} from session ${sessionId}`);
}

async function handleCallEnded(supabase: any, sessionId: string, data: any) {
  await supabase
    .from('external_meeting_sessions')
    .update({
      status: 'processing',
      bot_leave_time: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  console.log(`[Recall Webhook] Call ended for session ${sessionId}`);
}

function extractParticipants(chunks: any[]): string[] {
  const speakers = new Set<string>();
  chunks.forEach(chunk => {
    if (chunk.speaker) {
      speakers.add(chunk.speaker);
    }
  });
  return Array.from(speakers);
}
