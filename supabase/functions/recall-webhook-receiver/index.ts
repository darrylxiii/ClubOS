/**
 * Recall.ai Webhook Receiver
 * Handles callbacks from Recall.ai for meeting bot status updates,
 * transcriptions, and recording completion
 */
import { createHandler } from '../_shared/handler.ts';
import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(createHandler(async (req, ctx) => {
    const supabase = ctx.supabase;

    const payload = await req.json();
    console.log('[Recall Webhook] Received:', JSON.stringify(payload, null, 2));

    const { event, data } = payload;
    const botId = data?.bot_id || data?.id;
    const metadata = data?.metadata || {};
    const sessionId = metadata?.session_id;

    if (!sessionId && !botId) {
      console.log('[Recall Webhook] No session or bot ID found, skipping');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
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
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
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
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
    });
}));

async function handleBotStatusChange(supabase: SupabaseClient, sessionId: string, data: Record<string, unknown>) {
  const statusObj = data.status as Record<string, unknown> | string | undefined;
  const rawStatus = (typeof statusObj === 'object' && statusObj !== null ? statusObj.code : statusObj) as string;
  
  // Validate status against strict allowlist
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

  const mappedStatus = statusMap[rawStatus] || 'unknown';

  // Fetch existing metadata first, then merge safely (no SQL template literals)
  const { data: session } = await supabase
    .from('external_meeting_sessions')
    .select('metadata')
    .eq('id', sessionId)
    .single();

  const existingMetadata = (session?.metadata && typeof session.metadata === 'object') ? session.metadata : {};
  const updatedMetadata = {
    ...existingMetadata,
    last_status_update: mappedStatus,
    status_updated_at: new Date().toISOString(),
  };

  await supabase
    .from('external_meeting_sessions')
    .update({
      status: mappedStatus,
      updated_at: new Date().toISOString(),
      metadata: updatedMetadata,
    })
    .eq('id', sessionId);

  console.log(`[Recall Webhook] Updated session ${sessionId} status to: ${mappedStatus}`);
}

async function handleTranscription(supabase: SupabaseClient, sessionId: string, data: Record<string, unknown>) {
  const transcript = (data.transcript || data.text) as string;
  const words = (data.words || []) as unknown[];
  
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
    speaker: data.speaker as string | undefined,
    timestamp: (data.timestamp as string) || new Date().toISOString(),
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

async function handleMediaReady(supabase: SupabaseClient, sessionId: string, data: Record<string, unknown>) {
  const recordingUrl = (data.url || data.download_url) as string | undefined;
  
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
    .map((chunk: { speaker?: string; text: string }) => `[${chunk.speaker || 'Speaker'}]: ${chunk.text}`)
    .join('\n');

  // Calculate duration
  const durationSeconds = (data.duration_seconds as number) ||
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

async function handleCallEnded(supabase: SupabaseClient, sessionId: string, _data: Record<string, unknown>) {
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

function extractParticipants(chunks: Array<{ speaker?: string }>): string[] {
  const speakers = new Set<string>();
  chunks.forEach(chunk => {
    if (chunk.speaker) {
      speakers.add(chunk.speaker);
    }
  });
  return Array.from(speakers);
}
