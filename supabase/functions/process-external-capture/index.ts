/**
 * Process External Capture
 * Handles uploaded screen capture recordings from the native capture system
 * Chains to existing transcription and analysis pipeline
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { sessionId, recordingPath, platform, meetingTitle, hasAudio } = await req.json();

    if (!sessionId || !recordingPath) {
      return new Response(JSON.stringify({ error: 'Session ID and recording path required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing external capture for session ${sessionId}`);

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('external_meeting_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get signed URL for the recording
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('meeting-recordings')
      .createSignedUrl(recordingPath, 3600 * 24); // 24 hours

    if (urlError || !signedUrlData?.signedUrl) {
      console.error('Failed to get signed URL:', urlError);
      throw new Error('Failed to access recording file');
    }

    const recordingUrl = signedUrlData.signedUrl;

    // Create meeting_recordings_extended record
    const { data: recording, error: recordingError } = await supabase
      .from('meeting_recordings_extended')
      .insert({
        meeting_id: null, // External capture, no internal meeting
        user_id: user.id,
        recording_url: recordingUrl,
        storage_path: recordingPath,
        duration_seconds: session.duration_seconds || 0,
        file_size_bytes: session.metadata?.file_size_bytes || 0,
        mime_type: 'video/webm',
        status: 'processing',
        source_type: 'external_capture',
        metadata: {
          external_session_id: sessionId,
          platform: platform || session.platform,
          meeting_title: meetingTitle || session.meeting_title,
          has_audio: hasAudio,
          captured_at: session.metadata?.captured_at || new Date().toISOString()
        }
      })
      .select()
      .single();

    if (recordingError) {
      console.error('Failed to create recording record:', recordingError);
      throw recordingError;
    }

    // Update session with recording ID
    await supabase
      .from('external_meeting_sessions')
      .update({ 
        recording_id: recording.id,
        status: 'transcribing'
      })
      .eq('id', sessionId);

    // If we have audio, trigger transcription
    if (hasAudio) {
      try {
        console.log(`Triggering transcription for recording ${recording.id}`);
        
        const { error: transcribeError } = await supabase.functions.invoke('transcribe-recording', {
          body: {
            recordingId: recording.id,
            recordingUrl: recordingUrl,
            sourceType: 'external_capture'
          }
        });

        if (transcribeError) {
          console.error('Transcription error:', transcribeError);
          // Continue anyway, update status
          await supabase
            .from('external_meeting_sessions')
            .update({ 
              status: 'transcription_failed',
              notes: 'Transcription service error'
            })
            .eq('id', sessionId);
        }
      } catch (transcriptError) {
        console.error('Failed to invoke transcription:', transcriptError);
      }
    } else {
      // No audio, skip transcription
      console.log('No audio in capture, skipping transcription');
      
      await supabase
        .from('external_meeting_sessions')
        .update({ 
          status: 'completed',
          notes: 'Recording saved without audio transcription'
        })
        .eq('id', sessionId);

      await supabase
        .from('meeting_recordings_extended')
        .update({ status: 'completed' })
        .eq('id', recording.id);
    }

    return new Response(JSON.stringify({
      success: true,
      recordingId: recording.id,
      sessionId,
      hasAudio,
      message: hasAudio 
        ? 'Recording uploaded, transcription in progress' 
        : 'Recording saved (no audio for transcription)'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Process external capture error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process capture',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
