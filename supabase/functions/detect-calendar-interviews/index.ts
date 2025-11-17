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

interface EmailLookupMaps {
  tqcMap: Map<string, { userId: string; name: string }>;
  candidateMap: Map<string, { candidateId?: string; applicationId?: string; jobId?: string; name?: string }>;
  partnerMap: Map<string, { userId?: string; companyId?: string; name?: string }>;
}

async function buildEmailLookupMaps(
  supabase: any,
  allEmails: string[]
): Promise<EmailLookupMaps> {
  const maps: EmailLookupMaps = {
    tqcMap: new Map(),
    candidateMap: new Map(),
    partnerMap: new Map(),
  };

  if (allEmails.length === 0) return maps;

  // First get user_roles to identify TQC members
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'strategist']);

  const tqcUserIds = userRoles?.map((r: any) => r.user_id) || [];

  // Batch check TQC team members
  if (tqcUserIds.length > 0) {
    const { data: tqcUsers } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('email', allEmails)
      .in('id', tqcUserIds);

    if (tqcUsers) {
      tqcUsers.forEach((user: any) => {
        maps.tqcMap.set(user.email.toLowerCase(), {
          userId: user.id,
          name: user.full_name
        });
      });
    }
  }

  // Batch check candidates - simplified query
  const { data: candidates } = await supabase
    .from('candidate_profiles')
    .select('id, email, full_name')
    .in('email', allEmails);

  if (candidates) {
    // Get applications for these candidates
    const candidateIds = candidates.map((c: any) => c.id);
    const { data: applications } = await supabase
      .from('applications')
      .select('id, job_id, candidate_id')
      .in('candidate_id', candidateIds)
      .order('applied_at', { ascending: false });

    const appMap = new Map();
    applications?.forEach((app: any) => {
      if (!appMap.has(app.candidate_id)) {
        appMap.set(app.candidate_id, app);
      }
    });

    candidates.forEach((cand: any) => {
      const app = appMap.get(cand.id);
      maps.candidateMap.set(cand.email.toLowerCase(), {
        candidateId: cand.id,
        applicationId: app?.id,
        jobId: app?.job_id,
        name: cand.full_name
      });
    });
  }

  // Batch check partners - simplified
  const { data: companyMembers } = await supabase
    .from('company_members')
    .select('user_id, company_id')
    .eq('is_active', true);

  if (companyMembers) {
    const memberUserIds = companyMembers.map((m: any) => m.user_id);
    const { data: memberProfiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('email', allEmails)
      .in('id', memberUserIds);

    if (memberProfiles) {
      const userToCompany = new Map();
      companyMembers.forEach((m: any) => {
        userToCompany.set(m.user_id, m.company_id);
      });

      memberProfiles.forEach((profile: any) => {
        maps.partnerMap.set(profile.email.toLowerCase(), {
          userId: profile.id,
          companyId: userToCompany.get(profile.id),
          name: profile.full_name
        });
      });
    }
  }

  return maps;
}

function analyzeAttendeesWithMaps(
  attendeeEmails: string[],
  maps: EmailLookupMaps
): AttendeeAnalysis {
  const result: AttendeeAnalysis = {
    tqcMembers: [],
    candidates: [],
    partners: [],
    unknown: []
  };

  for (const email of attendeeEmails) {
    const lowerEmail = email.toLowerCase();

    const tqcData = maps.tqcMap.get(lowerEmail);
    if (tqcData) {
      result.tqcMembers.push({ email, ...tqcData });
      continue;
    }

    const candidateData = maps.candidateMap.get(lowerEmail);
    if (candidateData) {
      result.candidates.push({ email, ...candidateData });
      continue;
    }

    const partnerData = maps.partnerMap.get(lowerEmail);
    if (partnerData) {
      result.partners.push({ email, ...partnerData });
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

  if (hasTQC && hasCandidate && !hasPartner && 
      analysis.tqcMembers.length === 1 && analysis.candidates.length === 1) {
    return { type: 'tqc_intro', confidence: 'high' };
  }

  if (hasTQC && hasPartner && hasCandidate) {
    return { type: 'partner_interview', confidence: 'high' };
  }

  if (hasPartner && hasCandidate && analysis.partners.length > 1) {
    return { type: 'panel_interview', confidence: 'medium' };
  }

  if (hasPartner && hasCandidate && !hasTQC) {
    return { type: 'partner_interview', confidence: 'medium' };
  }

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

    let allEvents: any[] = [];
    
    for (const connection of connections) {
      console.log(`Fetching ${connection.provider} calendar ${connection.id}`);

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
          console.error(`Error fetching ${functionName}:`, eventsError);
          continue;
        }

        const events = eventsData?.events || [];
        console.log(`Found ${events.length} events from ${connection.provider}`);
        
        events.forEach((event: any) => {
          event._connectionId = connection.id;
          event._provider = connection.provider;
        });
        
        allEvents = allEvents.concat(events);
      } catch (error) {
        console.error(`Error invoking ${functionName}:`, error);
      }
    }

    console.log(`Total events: ${allEvents.length}`);

    // Limit to 30 most recent events to avoid timeout
    allEvents.sort((a, b) => {
      const dateA = new Date(a.start?.dateTime || a.start?.date || 0);
      const dateB = new Date(b.start?.dateTime || b.start?.date || 0);
      return dateB.getTime() - dateA.getTime();
    });
    allEvents = allEvents.slice(0, 30);
    console.log(`Processing ${allEvents.length} most recent events`);

    const allAttendeeEmails = new Set<string>();
    allEvents.forEach(event => {
      const attendeeEmails = event.attendees?.map((a: any) => a.email).filter(Boolean) || [];
      attendeeEmails.forEach((email: string) => allAttendeeEmails.add(email.toLowerCase()));
    });

    console.log(`Building lookup maps for ${allAttendeeEmails.size} unique emails`);
    const emailMaps = await buildEmailLookupMaps(supabase, Array.from(allAttendeeEmails));

    const { data: existingInterviews } = await supabase
      .from('detected_interviews')
      .select('calendar_event_id, calendar_provider')
      .in('calendar_event_id', allEvents.map(e => e.id));

    const existingSet = new Set(
      (existingInterviews || []).map((ei: any) => `${ei.calendar_provider}:${ei.calendar_event_id}`)
    );

    const detectedInterviews = [];

    for (const event of allEvents) {
      const attendeeEmails = event.attendees?.map((a: any) => a.email).filter(Boolean) || [];
      
      if (attendeeEmails.length === 0) continue;

      const eventKey = `${event._provider}:${event.id}`;
      if (existingSet.has(eventKey)) continue;

      const analysis = analyzeAttendeesWithMaps(attendeeEmails, emailMaps);
      const { type, confidence } = determineInterviewType(analysis);

      if (type === 'unknown' && confidence === 'low') continue;

      const detectedInterview = {
        calendar_event_id: event.id,
        calendar_provider: event._provider,
        calendar_connection_id: event._connectionId,
        detected_by: userId,
        detection_confidence: confidence,
        detection_type: type,
        title: event.summary || 'Untitled Meeting',
        description: event.description,
        scheduled_start: event.start?.dateTime || event.start?.date,
        scheduled_end: event.end?.dateTime || event.end?.date,
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
        detected_partners: analysis.partners.map(p => ({ 
          user_id: p.userId, 
          email: p.email,
          name: p.name 
        })),
        detected_tqc_members: analysis.tqcMembers.map(t => ({ 
          user_id: t.userId, 
          email: t.email,
          name: t.name 
        })),
        status: 'pending_review'
      };

      detectedInterviews.push(detectedInterview);
    }

    if (detectedInterviews.length > 0) {
      console.log(`Batch inserting ${detectedInterviews.length} detected interviews`);
      
      const { data: inserted, error: insertError } = await supabase
        .from('detected_interviews')
        .insert(detectedInterviews)
        .select();

      if (insertError) {
        console.error('Batch insert error:', insertError);
      } else {
        console.log(`Successfully inserted ${inserted?.length || 0} interviews`);
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
