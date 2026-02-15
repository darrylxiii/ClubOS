import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * process-manual-meeting
 *
 * Orchestrates: create meeting + recording rows, link participants, trigger analysis.
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
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
      duration,
      description,
      agenda,
      jobId,
      participants,       // array: { userId?, name, email?, role, isGuest }
      transcript,
      storagePath,
      mimeType,
      fileSizeBytes,
      notes,
      tags,
      isPrivate,
      recordingConsent,
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

    console.log(`[ProcessManualMeeting] candidate=${candidateId}, hasFile=${hasFile}, hasTranscript=${hasTranscript}, participants=${participants?.length || 0}`);

    // Processing status
    let processingStatus = 'pending';
    if (hasTranscript) {
      processingStatus = 'analyzing';
    } else if (hasFile) {
      processingStatus = 'transcribing';
    }

    // Parse tags into array
    const tagArray = tags
      ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

    // Build structured participants JSON for RAG storage
    const participantsJson = participants && participants.length > 0
      ? participants.map((p: any) => ({
          userId: p.userId || null,
          name: p.name,
          email: p.email || null,
          role: p.role,
          isGuest: p.isGuest || false,
        }))
      : null;

    // 1. Create meeting_recordings_extended row
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
        duration_seconds: duration ? duration * 60 : null,
        transcript: hasTranscript ? transcript.trim() : null,
        processing_status: processingStatus,
        recorded_at: meetingDate || new Date().toISOString(),
        participants: participantsJson,
        is_private: isPrivate || false,
        recording_consent_at: recordingConsent ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[ProcessManualMeeting] Insert error:', insertError);
      throw new Error(`Failed to create recording: ${insertError.message}`);
    }

    const recordingId = recording.id;
    console.log(`[ProcessManualMeeting] Created recording ${recordingId}`);

    // 2. Create meetings row
    let meetingId: string | null = null;
    try {
      const { data: meetingRow } = await supabase
        .from('meetings')
        .insert({
          title: title || 'Manual Meeting',
          meeting_type: meetingType || 'other',
          description: description || null,
          candidate_id: candidateId,
          job_id: jobId || null,
          scheduled_start: meetingDate || new Date().toISOString(),
          scheduled_end: duration && meetingDate
            ? new Date(new Date(meetingDate).getTime() + duration * 60000).toISOString()
            : null,
          status: 'completed',
          created_by: user.id,
          has_recording: hasFile,
        })
        .select('id')
        .single();

      meetingId = meetingRow?.id || null;
      console.log(`[ProcessManualMeeting] Created meeting ${meetingId}`);
    } catch (meetingErr) {
      console.warn('[ProcessManualMeeting] Could not create meetings entry:', meetingErr);
    }

    // 3. Create meeting_participants rows
    if (meetingId && participants && participants.length > 0) {
      const participantRows = participants.map((p: any) => ({
        meeting_id: meetingId,
        user_id: p.userId || null,
        guest_name: p.isGuest ? p.name : null,
        guest_email: p.isGuest ? (p.email || null) : null,
        role: p.role || 'interviewer',
        role_in_interview: p.role || 'interviewer',
        participant_type: p.isGuest ? 'guest' : 'member',
        attended: true,
        rsvp_status: 'accepted',
      }));

      const { error: partError } = await supabase
        .from('meeting_participants')
        .insert(participantRows);

      if (partError) {
        console.warn('[ProcessManualMeeting] Failed to insert participants:', partError);
      } else {
        console.log(`[ProcessManualMeeting] Created ${participantRows.length} participant rows`);
      }
    }

    // 4. Store notes and tags in metadata (update recording row)
    if (notes || tagArray.length > 0) {
      await supabase
        .from('meeting_recordings_extended')
        .update({
          executive_summary: notes || null,
          key_moments: tagArray.length > 0 ? { tags: tagArray } : null,
        })
        .eq('id', recordingId);
    }

    // 5. Trigger analysis pipeline (fire-and-forget)
    if (hasFile && !hasTranscript) {
      console.log(`[ProcessManualMeeting] Triggering transcription → analysis chain`);
      triggerFunction(supabaseUrl, supabaseServiceKey, 'transcribe-recording', {
        recordingId,
        chainAnalysis: true,
      });
    } else {
      console.log(`[ProcessManualMeeting] Triggering analysis directly`);
      triggerFunction(supabaseUrl, supabaseServiceKey, 'analyze-meeting-recording-advanced', {
        recordingId,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      recordingId,
      meetingId,
      processingStatus,
      participantsLinked: participants?.length || 0,
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
