import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AttendeeAnalysis {
  tqcMembers: { email: string; userId: string; name: string }[];
  candidates: { email: string; candidateId?: string; applicationId?: string; jobId?: string; name?: string }[];
  partners: { email: string; userId?: string; companyId?: string; name?: string }[];
  unknown: string[];
}

async function analyzeAttendees(
  supabase: any,
  attendeeEmails: string[]
): Promise<AttendeeAnalysis> {
  const result: AttendeeAnalysis = {
    tqcMembers: [],
    candidates: [],
    partners: [],
    unknown: []
  };

  for (const email of attendeeEmails) {
    // Check if TQC team
    const { data: tqcCheck } = await supabase.rpc('is_tqc_team_email', { check_email: email });
    if (tqcCheck?.[0]?.is_match) {
      result.tqcMembers.push({
        email,
        userId: tqcCheck[0].user_id,
        name: tqcCheck[0].full_name
      });
      continue;
    }

    // Check if candidate
    const { data: candidateCheck } = await supabase.rpc('is_candidate_email', { check_email: email });
    if (candidateCheck?.[0]?.is_match) {
      result.candidates.push({
        email,
        candidateId: candidateCheck[0].candidate_id,
        applicationId: candidateCheck[0].application_id,
        jobId: candidateCheck[0].job_id,
        name: candidateCheck[0].candidate_name
      });
      continue;
    }

    // Check if partner
    const { data: partnerCheck } = await supabase.rpc('is_partner_email', { check_email: email });
    if (partnerCheck?.[0]?.is_match) {
      result.partners.push({
        email,
        userId: partnerCheck[0].user_id,
        companyId: partnerCheck[0].company_id,
        name: partnerCheck[0].member_name
      });
      continue;
    }

    result.unknown.push(email);
  }

  return result;
}

function determineInterviewType(analysis: AttendeeAnalysis): {
  type: string;
  confidence: string;
} {
  const hasTQC = analysis.tqcMembers.length > 0;
  const hasCandidate = analysis.candidates.length > 0;
  const hasPartner = analysis.partners.length > 0;

  // TQC + Candidate (1:1) = First Introduction
  if (hasTQC && hasCandidate && !hasPartner && 
      analysis.tqcMembers.length === 1 && analysis.candidates.length === 1) {
    return { type: 'tqc_intro', confidence: 'high' };
  }

  // TQC + Partner + Candidate = Partner Interview (TQC booked it)
  if (hasTQC && hasPartner && hasCandidate) {
    return { type: 'partner_interview', confidence: 'high' };
  }

  // Multiple Partners + Candidate = Panel Interview
  if (hasPartner && hasCandidate && analysis.partners.length > 1) {
    return { type: 'panel_interview', confidence: 'medium' };
  }

  // Partner + Candidate (no TQC) = Partner Interview
  if (hasPartner && hasCandidate && !hasTQC) {
    return { type: 'partner_interview', confidence: 'medium' };
  }

  // Has candidate but unclear context
  if (hasCandidate) {
    return { type: 'unknown', confidence: 'low' };
  }

  return { type: 'unknown', confidence: 'low' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, startDate, endDate } = await req.json();

    console.log(`Scanning calendar for user ${userId} from ${startDate} to ${endDate}`);

    // Fetch calendar connections for this user
    const { data: connections } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ success: true, detected: 0, message: 'No calendar connections found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const detectedInterviews = [];

    for (const connection of connections) {
      console.log(`Checking ${connection.provider} calendar connection ${connection.id}`);

      // Fetch events from Google/Microsoft calendar
      const functionName = connection.provider === 'google' 
        ? 'google-calendar-events' 
        : 'microsoft-calendar-events';
      
      try {
        const { data: eventsData, error: eventsError } = await supabase.functions.invoke(functionName, {
          body: {
            action: 'listEvents',
            connectionId: connection.id,
            timeMin: startDate,
            timeMax: endDate,
          }
        });

        if (eventsError) {
          console.error(`Error fetching events from ${functionName}:`, eventsError);
          continue;
        }

        const events = eventsData?.events || [];
        console.log(`Found ${events.length} events`);

        for (const event of events) {
          const attendeeEmails = event.attendees?.map((a: any) => a.email).filter(Boolean) || [];
          
          // Skip events without attendees
          if (attendeeEmails.length === 0) continue;

          // Analyze attendees
          const analysis = await analyzeAttendees(supabase, attendeeEmails);
          const { type, confidence } = determineInterviewType(analysis);

          // Only process potential interviews
          if (type === 'unknown' && confidence === 'low') continue;

          // Check if already detected
          const { data: existing } = await supabase
            .from('detected_interviews')
            .select('id')
            .eq('calendar_event_id', event.id)
            .eq('calendar_provider', connection.provider)
            .maybeSingle();

          if (existing) {
            console.log(`Interview already detected: ${event.id}`);
            continue;
          }

          // Insert detected interview
          const detectedInterview = {
            calendar_event_id: event.id,
            calendar_provider: connection.provider,
            calendar_connection_id: connection.id,
            detected_by: userId,
            detection_confidence: confidence,
            detection_type: type,
            title: event.summary || 'Untitled Meeting',
            description: event.description,
            scheduled_start: event.start.dateTime || event.start.date,
            scheduled_end: event.end.dateTime || event.end.date,
            location: event.location,
            meeting_link: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
            tqc_organizer_id: userId,
            candidate_email: analysis.candidates[0]?.email,
            candidate_name: analysis.candidates[0]?.name,
            candidate_id: analysis.candidates[0]?.candidateId,
            application_id: analysis.candidates[0]?.applicationId,
            job_id: analysis.candidates[0]?.jobId,
            partner_user_ids: analysis.partners.map(p => p.userId).filter(Boolean),
            partner_emails: analysis.partners.map(p => p.email),
            all_attendee_emails: attendeeEmails,
            status: 'pending_review'
          };

          const { data: inserted, error: insertError } = await supabase
            .from('detected_interviews')
            .insert(detectedInterview)
            .select()
            .single();

          if (insertError) {
            console.error('Error inserting detected interview:', insertError);
            continue;
          }

          console.log(`Detected interview: ${inserted.title}`);
          detectedInterviews.push(inserted);
        }
      } catch (err) {
        console.error(`Error processing ${connection.provider} calendar:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        detected: detectedInterviews.length,
        interviews: detectedInterviews
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in detect-calendar-interviews:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
