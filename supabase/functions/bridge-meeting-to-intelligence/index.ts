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
    const { meetingId, meeting_id } = await req.json();
    const targetMeetingId = meetingId || meeting_id;
    
    if (!targetMeetingId) {
      throw new Error('meetingId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Bridge Meeting Intelligence] Processing meeting:', targetMeetingId);

    // 1. Get meeting details with company context
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        *,
        jobs:job_id (id, title, company_id),
        host:host_id (id, full_name, email)
      `)
      .eq('id', targetMeetingId)
      .single();

    if (meetingError || !meeting) {
      throw new Error(`Meeting not found: ${meetingError?.message}`);
    }

    // Resolve company_id from meeting or job
    const companyId = meeting.company_id || meeting.jobs?.company_id;
    
    if (!companyId) {
      console.log('[Bridge] No company_id found, skipping company intelligence');
      return new Response(
        JSON.stringify({ success: true, message: 'No company context for this meeting', bridged: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update meeting with company_id if not set
    if (!meeting.company_id && companyId) {
      await supabase.from('meetings').update({ company_id: companyId }).eq('id', targetMeetingId);
    }

    // 2. Get compiled transcript
    const { data: recording } = await supabase
      .from('meeting_recordings_extended')
      .select('transcript, transcript_json, duration_seconds')
      .eq('meeting_id', targetMeetingId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Get meeting participants
    const { data: participants } = await supabase
      .from('meeting_participants')
      .select('*')
      .eq('meeting_id', targetMeetingId);

    // 4. Create company_interaction record
    const { data: interaction, error: interactionError } = await supabase
      .from('company_interactions')
      .insert({
        company_id: companyId,
        job_id: meeting.job_id,
        interaction_type: 'zoom_meeting',
        interaction_subtype: meeting.meeting_type,
        interaction_date: meeting.start_time || meeting.scheduled_start,
        duration_minutes: recording?.duration_seconds ? Math.ceil(recording.duration_seconds / 60) : meeting.duration_minutes,
        direction: 'mutual',
        our_participant_id: meeting.host_id,
        subject: meeting.title,
        summary: meeting.description,
        raw_content: recording?.transcript,
        mentioned_candidates: meeting.candidate_id ? [meeting.candidate_id] : [],
        status: 'active',
        is_manually_entered: false,
        source_metadata: {
          source: 'meeting_bridge',
          meeting_id: targetMeetingId,
          meeting_type: meeting.meeting_type,
          participant_count: participants?.length || 0
        }
      })
      .select()
      .single();

    if (interactionError) {
      console.error('[Bridge] Error creating interaction:', interactionError);
    } else {
      console.log('[Bridge] Created company_interaction:', interaction.id);
    }

    // 5. Create/update meeting_intelligence record
    const { error: intelError } = await supabase
      .from('meeting_intelligence')
      .upsert({
        meeting_id: targetMeetingId,
        company_id: companyId,
        job_id: meeting.job_id,
        full_transcript: recording?.transcript,
        transcript_word_count: recording?.transcript ? recording.transcript.split(/\s+/).length : 0,
        processing_status: recording?.transcript ? 'pending' : 'no_transcript',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'meeting_id' });

    if (intelError) {
      console.error('[Bridge] Error creating meeting_intelligence:', intelError);
    }

    // 6. Create entity relationships for participants
    const relationships = [];
    if (participants) {
      for (const p of participants) {
        if (p.user_id) {
          relationships.push({
            source_type: 'meeting',
            source_id: targetMeetingId,
            target_type: 'profile',
            target_id: p.user_id,
            relationship_type: 'participated_in',
            strength_score: 0.8,
            evidence_sources: [{ source_type: 'meeting', source_id: targetMeetingId, timestamp: new Date().toISOString() }]
          });
        }
      }
    }

    if (relationships.length > 0) {
      await supabase.from('entity_relationships').insert(relationships);
    }

    // 7. Add to intelligence timeline
    await supabase.from('intelligence_timeline').insert({
      entity_type: 'company',
      entity_id: companyId,
      event_type: 'meeting',
      event_data: {
        meeting_id: targetMeetingId,
        title: meeting.title,
        type: meeting.meeting_type,
        has_transcript: !!recording?.transcript,
        participant_count: participants?.length || 0
      },
      significance_score: meeting.meeting_type?.includes('interview') ? 0.9 : 0.6,
      source_type: 'meeting',
      source_id: targetMeetingId
    });

    // 8. Update company intelligence score
    await supabase.rpc('update_company_intelligence_score', { p_company_id: companyId });

    console.log('[Bridge Meeting Intelligence] Complete for meeting:', targetMeetingId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        bridged: true,
        companyId,
        interactionId: interaction?.id,
        relationshipsCreated: relationships.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Bridge Meeting Intelligence] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
