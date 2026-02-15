import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * process-manual-meeting
 * 
 * Orchestrates: create recording row → transcribe (if needed) → analyze
 * 
 * Input:
 *   candidateId, title, meetingType, meetingDate, jobId?, participants?,
 *   transcript?, storagePath?, mimeType?, fileSizeBytes?
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth: get user from JWT
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      candidateId,
      title,
      meetingType,
      meetingDate,
      jobId,
      participants,
      transcript,
      storagePath,
      mimeType,
      fileSizeBytes,
    } = body;

    if (!candidateId) {
      return new Response(JSON.stringify({ error: 'candidateId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const hasFile = !!storagePath;
    const hasTranscript = !!transcript && transcript.trim().length > 0;

    if (!hasFile && !hasTranscript) {
      return new Response(JSON.stringify({ error: 'At least a transcript or file must be provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[ProcessManualMeeting] Starting for candidate=${candidateId}, hasFile=${hasFile}, hasTranscript=${hasTranscript}`);

    // Determine initial processing status
    let processingStatus = 'pending';
    if (hasTranscript && !hasFile) {
      processingStatus = 'analyzing';
    } else if (hasFile && !hasTranscript) {
      processingStatus = 'transcribing';
    } else {
      // Both: skip transcription, go to analyzing
      processingStatus = 'analyzing';
    }

    // 1. Create row in meeting_recordings_extended
    const { data: recording, error: insertError } = await supabase
      .from('meeting_recordings_extended')
      .insert({
        candidate_id: candidateId,
        job_id: jobId || null,
        host_id: user.id,
        title: title || 'Manual Meeting',
        source_type: 'manual_upload',
        storage_path: storagePath || null,
        mime_type: mimeType || null,
        file_size_bytes: fileSizeBytes || null,
        transcript: hasTranscript ? transcript.trim() : null,
        processing_status: processingStatus,
        recorded_at: meetingDate || new Date().toISOString(),
        participants: participants ? { names: participants.split(',').map((p: string) => p.trim()) } : null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[ProcessManualMeeting] Insert error:', insertError);
      throw new Error(`Failed to create recording: ${insertError.message}`);
    }

    const recordingId = recording.id;
    console.log(`[ProcessManualMeeting] Created recording ${recordingId}`);

    // 2. Create a meetings entry so MeetingIntelligenceCard picks it up
    try {
      await supabase.from('meetings').insert({
        title: title || 'Manual Meeting',
        meeting_type: meetingType || 'other',
        candidate_id: candidateId,
        job_id: jobId || null,
        scheduled_start: meetingDate || new Date().toISOString(),
        status: 'completed',
        created_by: user.id,
      });
    } catch (meetingErr) {
      console.warn('[ProcessManualMeeting] Could not create meetings entry (non-critical):', meetingErr);
    }

    // 3. Trigger the appropriate pipeline (fire-and-forget)
    if (hasFile && !hasTranscript) {
      // Needs transcription first (which chains to analysis)
      console.log(`[ProcessManualMeeting] Triggering transcription → analysis chain`);
      triggerFunction(supabaseUrl, supabaseServiceKey, 'transcribe-recording', {
        recordingId,
        chainAnalysis: true,
      });
    } else {
      // Has transcript (with or without file) → go straight to analysis
      console.log(`[ProcessManualMeeting] Triggering analysis directly`);
      triggerFunction(supabaseUrl, supabaseServiceKey, 'analyze-meeting-recording-advanced', {
        recordingId,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      recordingId,
      processingStatus,
      message: hasTranscript
        ? 'Transcript submitted for AI analysis.'
        : 'File submitted for transcription and analysis.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ProcessManualMeeting] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Fire-and-forget call to another edge function
 */
function triggerFunction(supabaseUrl: string, serviceKey: string, functionName: string, payload: Record<string, unknown>) {
  fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(payload),
  }).then(res => {
    if (!res.ok) {
      console.warn(`[ProcessManualMeeting] ${functionName} returned ${res.status}`);
    } else {
      console.log(`[ProcessManualMeeting] ${functionName} triggered OK`);
    }
  }).catch(err => {
    console.warn(`[ProcessManualMeeting] Failed to trigger ${functionName}:`, err);
  });
}
