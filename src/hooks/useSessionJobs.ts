import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SessionJob {
  id: string;
  session_id: string;
  job_id: string;
  started_at: string;
  ended_at: string | null;
  minutes_logged: number | null;
  is_primary: boolean;
  productivity_rating: number | null;
  created_at: string;
  // joined
  jobs?: { id: string; title: string; companies?: { name: string } | null } | null;
}

export interface TimeCorrection {
  id: string;
  session_job_id: string;
  session_id: string;
  corrected_by: string;
  original_minutes: number;
  corrected_minutes: number;
  reason: string;
  correction_type: string;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

export interface JobInsight {
  job_id: string;
  job_title: string;
  company_name: string | null;
  total_sessions: number;
  total_minutes: number;
  unique_accounts: number;
  unique_users: number;
  avg_session_minutes: number;
  last_activity: string | null;
  accounts_used: string[];
}

export function useSessionJobs(sessionId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const sessionJobsQuery = useQuery({
    queryKey: ['session-jobs', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('linkedin_avatar_session_jobs')
        .select('*, jobs(id, title, companies(name))')
        .eq('session_id', sessionId!)
        .order('started_at', { ascending: true });
      if (error) throw error;
      return data as SessionJob[];
    },
    enabled: !!sessionId,
  });

  const createSessionJob = useMutation({
    mutationFn: async (params: { session_id: string; job_id: string; is_primary?: boolean }) => {
      const { data, error } = await supabase
        .from('linkedin_avatar_session_jobs')
        .insert({ ...params, started_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-jobs'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const endSessionJob = useMutation({
    mutationFn: async (sessionJobId: string) => {
      const now = new Date();
      // Get the record first to calculate minutes
      const { data: existing } = await supabase
        .from('linkedin_avatar_session_jobs')
        .select('started_at')
        .eq('id', sessionJobId)
        .single();
      
      const minutes = existing
        ? Math.round((now.getTime() - new Date(existing.started_at).getTime()) / 60000)
        : 0;

      const { error } = await supabase
        .from('linkedin_avatar_session_jobs')
        .update({ ended_at: now.toISOString(), minutes_logged: minutes })
        .eq('id', sessionJobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-jobs'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const switchJob = useMutation({
    mutationFn: async (params: { session_id: string; current_session_job_id: string; new_job_id: string }) => {
      // End current job tracking
      const now = new Date();
      const { data: existing } = await supabase
        .from('linkedin_avatar_session_jobs')
        .select('started_at')
        .eq('id', params.current_session_job_id)
        .single();
      
      const minutes = existing
        ? Math.round((now.getTime() - new Date(existing.started_at).getTime()) / 60000)
        : 0;

      await supabase
        .from('linkedin_avatar_session_jobs')
        .update({ ended_at: now.toISOString(), minutes_logged: minutes })
        .eq('id', params.current_session_job_id);

      // Start new job tracking
      const { data, error } = await supabase
        .from('linkedin_avatar_session_jobs')
        .insert({
          session_id: params.session_id,
          job_id: params.new_job_id,
          started_at: now.toISOString(),
          is_primary: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-jobs'] });
      toast.success('Switched job.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitCorrection = useMutation({
    mutationFn: async (params: {
      session_job_id: string;
      session_id: string;
      original_minutes: number;
      corrected_minutes: number;
      reason: string;
      correction_type: string;
    }) => {
      // Insert correction record
      const { error: corrErr } = await supabase
        .from('linkedin_avatar_time_corrections')
        .insert({
          session_job_id: params.session_job_id,
          session_id: params.session_id,
          corrected_by: user!.id,
          original_minutes: params.original_minutes,
          corrected_minutes: params.corrected_minutes,
          reason: params.reason,
          correction_type: params.correction_type,
        });
      if (corrErr) throw corrErr;

      // Update minutes_logged on session_job
      const { error: updateErr } = await supabase
        .from('linkedin_avatar_session_jobs')
        .update({ minutes_logged: params.corrected_minutes })
        .eq('id', params.session_job_id);
      if (updateErr) throw updateErr;

      // Log event
      await supabase.from('linkedin_avatar_events').insert({
        account_id: null as any,
        user_id: user!.id,
        event_type: 'time_corrected',
        metadata: {
          session_job_id: params.session_job_id,
          original_minutes: params.original_minutes,
          corrected_minutes: params.corrected_minutes,
          reason: params.reason,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-jobs'] });
      toast.success('Time correction saved.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    ...sessionJobsQuery,
    createSessionJob,
    endSessionJob,
    switchJob,
    submitCorrection,
  };
}

/** Fetch all published jobs for the job selector */
export function useAvailableJobs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['available-jobs-for-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, companies(name), location')
        .eq('status', 'published')
        .order('title');
      if (error) throw error;
      return data as { id: string; title: string; companies: { name: string } | null; location: string | null }[];
    },
    enabled: !!user,
  });
}

/** Job-level analytics across all sessions */
export function useJobInsights() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['job-insights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('linkedin_avatar_session_jobs')
        .select(`
          id, job_id, started_at, ended_at, minutes_logged, is_primary,
          jobs(id, title, companies(name)),
          linkedin_avatar_sessions!inner(id, account_id, user_id, started_at, linkedin_avatar_accounts(label))
        `)
        .order('started_at', { ascending: false });
      if (error) throw error;

      // Aggregate in JS
      const map = new Map<string, JobInsight>();
      for (const row of data as any[]) {
        const jobId = row.job_id;
        const jobTitle = row.jobs?.title ?? 'Unknown';
        const companyName = row.jobs?.companies?.name ?? null;
        const minutes = row.minutes_logged ?? 0;
        const accountLabel = row.linkedin_avatar_sessions?.linkedin_avatar_accounts?.label ?? 'Unknown';
        const userId = row.linkedin_avatar_sessions?.user_id;

        if (!map.has(jobId)) {
          map.set(jobId, {
            job_id: jobId,
            job_title: jobTitle,
            company_name: companyName,
            total_sessions: 0,
            total_minutes: 0,
            unique_accounts: 0,
            unique_users: 0,
            avg_session_minutes: 0,
            last_activity: null,
            accounts_used: [],
          });
        }
        const insight = map.get(jobId)!;
        insight.total_sessions++;
        insight.total_minutes += minutes;
        if (!insight.accounts_used.includes(accountLabel)) {
          insight.accounts_used.push(accountLabel);
        }
        // Track unique users via a temporary set (we'll store count)
        if (!insight.last_activity || row.started_at > insight.last_activity) {
          insight.last_activity = row.started_at;
        }
      }

      // Compute averages and unique counts
      const insights = Array.from(map.values());
      for (const i of insights) {
        i.avg_session_minutes = i.total_sessions > 0 ? Math.round(i.total_minutes / i.total_sessions) : 0;
        i.unique_accounts = i.accounts_used.length;
      }

      return insights.sort((a, b) => b.total_minutes - a.total_minutes);
    },
    enabled: !!user,
  });
}
