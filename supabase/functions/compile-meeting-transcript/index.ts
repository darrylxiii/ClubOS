import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { meetingId, recordingId } = await req.json();
    
    if (!meetingId && !recordingId) {
      throw new Error('Either meetingId or recordingId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Compile Transcript] Starting for:', { meetingId, recordingId });

    // Fetch all transcript segments for this meeting
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('meeting_transcripts')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('timestamp', { ascending: true });

    if (transcriptsError) {
      console.error('[Compile Transcript] Error fetching transcripts:', transcriptsError);
      throw transcriptsError;
    }

    if (!transcripts || transcripts.length === 0) {
      console.log('[Compile Transcript] No transcripts found for meeting:', meetingId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No transcripts to compile',
          transcriptLength: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get speaker names from profiles
    const speakerIds = [...new Set(transcripts.map(t => t.speaker_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', speakerIds);

    const speakerMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

    // Build transcript JSON with timestamps for sync playback
    const transcriptJson = transcripts.map(t => ({
      timestamp_ms: new Date(t.timestamp).getTime(),
      timestamp: t.timestamp,
      speaker_id: t.speaker_id,
      speaker_name: speakerMap.get(t.speaker_id) || 'Unknown Speaker',
      text: t.text,
      confidence: t.confidence || 1.0
    }));

    // Build plain text transcript with speaker labels
    const plainTextTranscript = transcripts.map(t => {
      const speaker = speakerMap.get(t.speaker_id) || 'Unknown';
      const time = new Date(t.timestamp).toISOString().substr(11, 8);
      return `[${time}] ${speaker}: ${t.text}`;
    }).join('\n\n');

    // Find or create recording entry
    let targetRecordingId = recordingId;

    if (!targetRecordingId && meetingId) {
      // Check if recording exists for this meeting
      const { data: existingRecording } = await supabase
        .from('meeting_recordings_extended')
        .select('id')
        .eq('meeting_id', meetingId)
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
          processing_status: 'transcribed'
        })
        .eq('id', targetRecordingId);

      if (updateError) {
        console.error('[Compile Transcript] Error updating recording:', updateError);
        throw updateError;
      }

      console.log('[Compile Transcript] Updated recording:', targetRecordingId);
    }

    console.log('[Compile Transcript] Compiled', transcripts.length, 'segments');

    return new Response(
      JSON.stringify({ 
        success: true, 
        recordingId: targetRecordingId,
        transcriptLength: plainTextTranscript.length,
        segmentCount: transcripts.length,
        transcript: plainTextTranscript.substring(0, 500) + '...'
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
