import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserSession {
  id: string;
  user_id: string;
  session_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_fingerprint: string | null;
  country: string | null;
  city: string | null;
  is_suspicious: boolean | null;
  suspicious_reason: string | null;
  created_at: string;
  last_activity: string;
  user_email?: string;
}

export function useActiveSessions() {
  return useQuery({
    queryKey: ['active-sessions'],
    queryFn: async (): Promise<UserSession[]> => {
      const { data, error } = await supabase
        .from('user_sessions_security')
        .select('*')
        .order('last_activity', { ascending: false })
        .limit(100);

      if (error) throw error;

      const userIds = [...new Set(data?.map(s => s.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      return (data || []).map(session => ({
        ...session,
        user_email: emailMap.get(session.user_id) || 'Unknown'
      }));
    },
    refetchInterval: 15000,
  });
}

export function useSuspiciousSessions() {
  return useQuery({
    queryKey: ['suspicious-sessions'],
    queryFn: async (): Promise<UserSession[]> => {
      const { data, error } = await supabase
        .from('user_sessions_security')
        .select('*')
        .eq('is_suspicious', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const userIds = [...new Set(data?.map(s => s.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      return (data || []).map(session => ({
        ...session,
        user_email: emailMap.get(session.user_id) || 'Unknown'
      }));
    },
    refetchInterval: 30000,
  });
}

export function useTerminateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('user_sessions_security')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['suspicious-sessions'] });
      toast.success('Session terminated');
    },
    onError: (error) => {
      toast.error('Failed to terminate session: ' + error.message);
    },
  });
}

export function useTerminateAllUserSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_sessions_security')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['suspicious-sessions'] });
      toast.success('All user sessions terminated');
    },
    onError: (error) => {
      toast.error('Failed to terminate sessions: ' + error.message);
    },
  });
}

export function useSessionStats() {
  return useQuery({
    queryKey: ['session-stats'],
    queryFn: async () => {
      const { count: activeCount } = await supabase
        .from('user_sessions_security')
        .select('*', { count: 'exact', head: true });

      const { count: suspiciousCount } = await supabase
        .from('user_sessions_security')
        .select('*', { count: 'exact', head: true })
        .eq('is_suspicious', true);

      const { data: countries } = await supabase
        .from('user_sessions_security')
        .select('country')
        .not('country', 'is', null);

      const uniqueCountries = new Set(countries?.map(c => c.country)).size;

      return {
        activeSessions: activeCount || 0,
        suspiciousSessions: suspiciousCount || 0,
        uniqueCountries,
      };
    },
    refetchInterval: 30000,
  });
}
