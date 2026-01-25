import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatTimestamp(ms: number, startMs: number): string {
  const elapsed = Math.max(0, ms - startMs);
  const totalSeconds = Math.floor(elapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { meetingId, meeting_id, recordingId, recording_id } = await req.json();
    
    // Support both camelCase and snake_case
    const targetMeetingId = meetingId || meeting_id;
    let targetRecordingId = recordingId || recording_id;
    
    if (!targetMeetingId && !targetRecordingId) {
      throw new Error('Either meetingId or recordingId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Compile Transcript] Starting for:', { meetingId: targetMeetingId, recordingId: targetRecordingId });

    // If we have recording_id but no meeting_id, get it from the recording
    let resolvedMeetingId = targetMeetingId;
    if (!resolvedMeetingId && targetRecordingId) {
      const { data: recording } = await supabase
        .from('meeting_recordings_extended')
        .select('meeting_id')
        .eq('id', targetRecordingId)
        .single();
      
      if (recording) {
        resolvedMeetingId = recording.meeting_id;
      }
    }

    if (!resolvedMeetingId) {
      throw new Error('Could not determine meeting ID');
    }

    // Fetch all final transcript segments for this meeting, ordered by timestamp
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('meeting_transcripts')
      .select('*')
      .eq('meeting_id', resolvedMeetingId)
      .eq('is_final', true)
      .order('timestamp_ms', { ascending: true });

    if (transcriptsError) {
      console.error('[Compile Transcript] Error fetching transcripts:', transcriptsError);
      throw transcriptsError;
    }

    if (!transcripts || transcripts.length === 0) {
      console.log('[Compile Transcript] No transcripts found for meeting:', resolvedMeetingId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No transcripts to compile',
          transcriptLength: 0,
          segmentCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the start timestamp for relative timing
    const startMs = transcripts[0].timestamp_ms;

    // Build transcript JSON with timestamps for sync playback
    const transcriptJson = transcripts.map(t => ({
      timestamp: formatTimestamp(t.timestamp_ms, startMs),
      timestamp_ms: t.timestamp_ms - startMs,
      speaker_name: t.participant_name || 'Unknown Speaker',
      text: t.text,
      confidence: t.confidence || 1.0
    }));

    // Build plain text transcript with speaker labels
    const plainTextTranscript = transcripts.map(t => {
      const time = formatTimestamp(t.timestamp_ms, startMs);
      const speaker = t.participant_name || 'Unknown';
      return `[${time}] ${speaker}: ${t.text}`;
    }).join('\n');

    // Find or create recording entry
    if (!targetRecordingId && resolvedMeetingId) {
      // Check if recording exists for this meeting
      const { data: existingRecording } = await supabase
        .from('meeting_recordings_extended')
        .select('id')
        .eq('meeting_id', resolvedMeetingId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingRecording) {
        targetRecordingId = existingRecording.id;
      }
    }

    if (targetRecordingId) {
      // Update existing recording with compiled transcript
      const { error: updateError } = await supabase
        .from('meeting_recordings_extended')
        .update({
          transcript: plainTextTranscript,
          transcript_json: transcriptJson,
          processing_status: 'analyzing',
          updated_at: new Date().toISOString()
        })
        .eq('id', targetRecordingId);

      if (updateError) {
        console.error('[Compile Transcript] Error updating recording:', updateError);
        // Don't throw, still return success with transcript
      } else {
        console.log('[Compile Transcript] Updated recording:', targetRecordingId);
      }
    }

    console.log('[Compile Transcript] Compiled', transcripts.length, 'segments,', plainTextTranscript.length, 'characters');

    return new Response(
      JSON.stringify({ 
        success: true, 
        recordingId: targetRecordingId,
        meetingId: resolvedMeetingId,
        transcriptLength: plainTextTranscript.length,
        segmentCount: transcripts.length,
        durationMs: transcripts.length > 0 ? transcripts[transcripts.length - 1].timestamp_ms - startMs : 0,
        transcript: plainTextTranscript.length > 500 ? plainTextTranscript.substring(0, 500) + '...' : plainTextTranscript
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Compile Transcript] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
