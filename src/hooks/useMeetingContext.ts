import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MeetingWithContext {
  id: string;
  title: string;
  description?: string;
  meeting_type?: string;
  interview_stage?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  status: string;
  candidate?: {
    id: string;
    full_name: string;
    email?: string;
    avatar_url?: string;
    current_title?: string;
    current_company?: string;
  };
  job?: {
    id: string;
    title: string;
    department?: string;
    location?: string;
  };
  application?: {
    id: string;
    status: string;
    current_stage_index?: number;
  };
  company?: {
    id: string;
    name: string;
    logo_url?: string;
  };
  participants: {
    id: string;
    user_id?: string;
    guest_name?: string;
    guest_email?: string;
    role?: string;
    participant_type?: string;
    role_in_interview?: string;
    rsvp_status?: string;
    profile?: {
      full_name?: string;
      avatar_url?: string;
    };
  }[];
  scorecards: {
    id: string;
    evaluator_id: string;
    overall_rating?: number;
    recommendation?: string;
    status: string;
    submitted_at?: string;
  }[];
  ai_analysis?: {
    status: string;
    summary?: string;
    recommendation?: string;
    key_moments?: any[];
  };
}

export const useMeetingContext = (meetingId?: string) => {
  const [meeting, setMeeting] = useState<MeetingWithContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeeting = useCallback(async () => {
    if (!meetingId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch meeting with all related data
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select(`
          id,
          title,
          description,
          meeting_type,
          interview_stage,
          scheduled_start,
          scheduled_end,
          status,
          candidate_id,
          job_id,
          application_id,
          company_id,
          ai_analysis_status,
          ai_summary,
          ai_recommendation,
          ai_key_moments
        `)
        .eq('id', meetingId)
        .single();

      if (meetingError) throw meetingError;

      // Fetch participants
      const { data: participants } = await supabase
        .from('meeting_participants')
        .select(`
          id,
          user_id,
          guest_name,
          guest_email,
          role,
          participant_type,
          role_in_interview,
          rsvp_status,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('meeting_id', meetingId);

      // Fetch scorecards
      const { data: scorecards } = await supabase
        .from('candidate_scorecards')
        .select(`
          id,
          evaluator_id,
          overall_rating,
          recommendation,
          status,
          submitted_at
        `)
        .eq('meeting_id', meetingId);

      // Fetch candidate if linked
      let candidate = null;
      if (meetingData.candidate_id) {
        const { data } = await supabase
          .from('candidate_profiles')
          .select('id, full_name, email, avatar_url, current_title, current_company')
          .eq('id', meetingData.candidate_id)
          .single();
        candidate = data;
      }

      // Fetch job if linked
      let job = null;
      if (meetingData.job_id) {
        const { data } = await supabase
          .from('jobs')
          .select('id, title, location')
          .eq('id', meetingData.job_id)
          .single();
        job = data;
      }

      // Fetch application if linked
      let application = null;
      if (meetingData.application_id) {
        const { data } = await supabase
          .from('applications')
          .select('id, status, current_stage_index')
          .eq('id', meetingData.application_id)
          .single();
        application = data;
      }

      // Fetch company if linked
      let company = null;
      if (meetingData.company_id) {
        const { data } = await supabase
          .from('companies')
          .select('id, name, logo_url')
          .eq('id', meetingData.company_id)
          .single();
        company = data;
      }

      setMeeting({
        ...meetingData,
        description: meetingData.description ?? undefined,
        meeting_type: meetingData.meeting_type ?? undefined,
        interview_stage: meetingData.interview_stage ?? undefined,
        candidate: candidate ? {
          ...candidate,
          email: candidate.email ?? undefined,
          avatar_url: candidate.avatar_url ?? undefined,
          current_title: candidate.current_title ?? undefined,
          current_company: candidate.current_company ?? undefined,
        } : undefined,
        job: job ? {
          ...job,
          location: job.location ?? undefined,
        } : undefined,
        application: application ?? undefined,
        company: company ? {
          ...company,
          logo_url: company.logo_url ?? undefined,
        } : undefined,
        participants: participants?.map(p => ({
          ...p,
          user_id: p.user_id ?? undefined,
          guest_name: p.guest_name ?? undefined,
          guest_email: p.guest_email ?? undefined,
          participant_type: p.participant_type ?? undefined,
          role_in_interview: p.role_in_interview ?? undefined,
          rsvp_status: p.rsvp_status ?? undefined,
          avatar_url: (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles)?.avatar_url ?? undefined,
          current_title: (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles)?.current_title ?? undefined,
          profile: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
        })) || [],
        scorecards: scorecards?.map(s => ({
          ...s,
          overall_rating: s.overall_rating ?? undefined,
          recommendation: s.recommendation ?? undefined,
          status: s.status ?? 'pending',
          submitted_at: s.submitted_at ?? undefined
        })) || [],
        ai_analysis: {
          status: meetingData.ai_analysis_status || 'pending',
          summary: meetingData.ai_summary ?? undefined,
          recommendation: meetingData.ai_recommendation ?? undefined,
          key_moments: Array.isArray(meetingData.ai_key_moments) ? meetingData.ai_key_moments : []
        }
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchMeeting();
  }, [fetchMeeting]);

  return { meeting, loading, error, refetch: fetchMeeting };
};

export const useUpcomingMeetingsWithContext = (userId?: string) => {
  const [meetings, setMeetings] = useState<MeetingWithContext[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const now = new Date().toISOString();

        // Fetch upcoming meetings where user is host or participant
        const { data: hostedMeetings } = await supabase
          .from('meetings')
          .select(`
            id,
            title,
            description,
            meeting_type,
            interview_stage,
            scheduled_start,
            scheduled_end,
            status,
            candidate_id,
            job_id,
            application_id,
            company_id
          `)
          .eq('host_id', userId)
          .gte('scheduled_start', now)
          .eq('status', 'scheduled')
          .order('scheduled_start', { ascending: true })
          .limit(10);

        const { data: participantMeetings } = await supabase
          .from('meeting_participants')
          .select(`
            meeting:meeting_id (
              id,
              title,
              description,
              meeting_type,
              interview_stage,
              scheduled_start,
              scheduled_end,
              status,
              candidate_id,
              job_id,
              application_id,
              company_id
            )
          `)
          .eq('user_id', userId)
          .gte('meeting.scheduled_start', now);

        // Combine and dedupe meetings
        const allMeetings = [
          ...(hostedMeetings || []),
          ...(participantMeetings?.map(p => p.meeting).filter(Boolean) || [])
        ];

        const uniqueMeetings = Array.from(
          new Map<string, any>(allMeetings.map(m => [m.id, m])).values()
        ).sort((a, b) =>
          new Date(a.scheduled_start!).getTime() - new Date(b.scheduled_start!).getTime()
        );

        // Fetch candidate info for each meeting
        const enrichedMeetings = await Promise.all(
          uniqueMeetings.slice(0, 10).map(async (meeting) => {
            let candidate = null;
            if (meeting.candidate_id) {
              const { data } = await supabase
                .from('candidate_profiles')
                .select('id, full_name, avatar_url, current_title')
                .eq('id', meeting.candidate_id)
                .single();
              candidate = data;
            }

            let job = null;
            if (meeting.job_id) {
              const { data } = await supabase
                .from('jobs')
                .select('id, title')
                .eq('id', meeting.job_id)
                .single();
              job = data;
            }

            return {
              ...meeting,
              candidate,
              job,
              participants: [],
              scorecards: []
            } as MeetingWithContext;
          })
        );

        setMeetings(enrichedMeetings);
      } catch (err) {
        console.error('Error fetching meetings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, [userId]);

  return { meetings, loading };
};
