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
  created_at: string;
  // joined
  profiles?: { full_name: string | null; avatar_url: string | null };
  linkedin_avatar_accounts?: { label: string };
}

export function useAvatarSessions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const sessionsQuery = useQuery({
    queryKey: ['avatar-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('linkedin_avatar_sessions')
        .select('*, profiles(full_name, avatar_url), linkedin_avatar_accounts(label)')
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
    mutationFn: async (params: { account_id: string; expected_end_at: string; purpose: string }) => {
      const { data, error } = await supabase
        .from('linkedin_avatar_sessions')
        .insert({ ...params, user_id: user!.id, status: 'active' })
        .select()
        .single();
      if (error) {
        // Extract readable conflict message from trigger
        if (error.message.includes('currently in use')) {
          throw new Error(error.message.replace(/^.*?Account/, 'Account'));
        }
        throw error;
      }
      // Log event
      await supabase.from('linkedin_avatar_events').insert({
        account_id: params.account_id,
        user_id: user!.id,
        event_type: 'session_started',
        metadata: { session_id: data.id, purpose: params.purpose },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatar-sessions'] });
      toast.success('Session started.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const endSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('linkedin_avatar_sessions')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
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
