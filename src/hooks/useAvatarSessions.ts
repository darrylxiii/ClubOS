import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AvatarSession {
  id: string;
  account_id: string;
  user_id: string;
  started_at: string;
  expected_end_at: string;
  ended_at: string | null;
  status: string;
  purpose: string;
  primary_job_id: string | null;
  anomaly_flags: string[] | null;
  created_at: string;
  // joined
  profiles?: { full_name: string | null; avatar_url: string | null };
  linkedin_avatar_accounts?: { label: string };
  jobs?: { id: string; title: string; companies?: { name: string } | null } | null;
}

export function useAvatarSessions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const sessionsQuery = useQuery({
    queryKey: ['avatar-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('linkedin_avatar_sessions')
        .select('*, profiles(full_name, avatar_url), linkedin_avatar_accounts(label), jobs(id, title, companies(name))')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AvatarSession[];
    },
    enabled: !!user,
  });

  const activeSessions = (sessionsQuery.data ?? []).filter(s => s.status === 'active');

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('avatar-sessions-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'linkedin_avatar_sessions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['avatar-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['avatar-accounts'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const startSession = useMutation({
    mutationFn: async (params: {
      account_id: string;
      expected_end_at: string;
      purpose: string;
      job_id: string;
    }) => {
      const { job_id, ...sessionParams } = params;
      const { data, error } = await supabase
        .from('linkedin_avatar_sessions')
        .insert({
          ...sessionParams,
          user_id: user!.id,
          status: 'active',
          primary_job_id: job_id,
        })
        .select()
        .single();
      if (error) {
        if (error.message.includes('currently in use')) {
          throw new Error(error.message.replace(/^.*?Account/, 'Account'));
        }
        throw error;
      }

      // Create session-job link
      await supabase.from('linkedin_avatar_session_jobs').insert({
        session_id: data.id,
        job_id,
        started_at: new Date().toISOString(),
        is_primary: true,
      });

      // Log event
      await supabase.from('linkedin_avatar_events').insert({
        account_id: params.account_id,
        user_id: user!.id,
        event_type: 'session_started',
        metadata: { session_id: data.id, purpose: params.purpose, job_id },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatar-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-jobs'] });
      toast.success('Session started.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const endSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const now = new Date().toISOString();

      // End any open session-job entries
      const { data: openJobs } = await supabase
        .from('linkedin_avatar_session_jobs')
        .select('id, started_at')
        .eq('session_id', sessionId)
        .is('ended_at', null);

      if (openJobs && openJobs.length > 0) {
        for (const sj of openJobs) {
          const minutes = Math.round(
            (new Date(now).getTime() - new Date(sj.started_at).getTime()) / 60000
          );
          await supabase
            .from('linkedin_avatar_session_jobs')
            .update({ ended_at: now, minutes_logged: minutes })
            .eq('id', sj.id);
        }
      }

      const { error } = await supabase
        .from('linkedin_avatar_sessions')
        .update({ status: 'completed', ended_at: now })
        .eq('id', sessionId);
      if (error) throw error;

      // Log event
      const session = sessionsQuery.data?.find(s => s.id === sessionId);
      if (session) {
        await supabase.from('linkedin_avatar_events').insert({
          account_id: session.account_id,
          user_id: user!.id,
          event_type: 'session_ended',
          metadata: { session_id: sessionId },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatar-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-jobs'] });
      toast.success('Session ended.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...sessionsQuery, activeSessions, startSession, endSession };
}

export function useActiveAvatarSession() {
  const { user } = useAuth();
  const { data, activeSessions, endSession } = useAvatarSessions();

  const mySession = activeSessions.find(s => s.user_id === user?.id) ?? null;

  return { mySession, endSession, allActiveSessions: activeSessions };
}
