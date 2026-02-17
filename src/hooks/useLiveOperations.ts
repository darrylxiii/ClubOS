import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OnlineMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  status: 'online' | 'away';
  lastSeenMinutes: number;
  recentlyActive: boolean; // active in last 60s — pulse animation
}

export interface ActiveAvatarSession {
  id: string;
  accountLabel: string;
  accountAvatarUrl: string | null;
  operatorName: string;
  jobTitle: string | null;
  companyName: string | null;
  startedAt: string;
  expectedEndAt: string;
  riskLevel: string | null;
  healthStatus: 'healthy' | 'warning' | 'overdue';
}

export function useLiveOperations() {
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);
  const [offlineCount, setOfflineCount] = useState(0);
  const [activeSessions, setActiveSessions] = useState<ActiveAvatarSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPresence = useCallback(async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .limit(100);

    if (!profiles?.length) {
      setOnlineMembers([]);
      setOfflineCount(0);
      return;
    }

    const { data: presenceData } = await supabase
      .from('user_presence')
      .select('user_id, status, last_seen')
      .in('user_id', profiles.map(p => p.id));

    const presenceMap = new Map(presenceData?.map(p => [p.user_id, p]) || []);
    const now = Date.now();
    const online: OnlineMember[] = [];
    let offline = 0;

    for (const profile of profiles) {
      const presence = presenceMap.get(profile.id);
      if (!presence || presence.status !== 'online') {
        offline++;
        continue;
      }

      const lastSeen = new Date(presence.last_seen).getTime();
      const minutesAgo = (now - lastSeen) / 60000;

      if (minutesAgo < 15) {
        online.push({
          id: profile.id,
          full_name: profile.full_name || 'Unknown',
          avatar_url: profile.avatar_url,
          status: minutesAgo < 5 ? 'online' : 'away',
          lastSeenMinutes: Math.round(minutesAgo),
          recentlyActive: minutesAgo < 1,
        });
      } else {
        offline++;
      }
    }

    // Sort: online first, then away; recently active first
    online.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'online' ? -1 : 1;
      return a.lastSeenMinutes - b.lastSeenMinutes;
    });

    setOnlineMembers(online);
    setOfflineCount(offline);
  }, []);

  const loadActiveSessions = useCallback(async () => {
    const { data } = await supabase
      .from('linkedin_avatar_sessions')
      .select('id, started_at, expected_end_at, linkedin_avatar_accounts(label, avatar_url, risk_level), profiles(full_name), jobs(title, companies(name))')
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    if (!data) {
      setActiveSessions([]);
      return;
    }

    const now = Date.now();
    const sessions: ActiveAvatarSession[] = data.map((s: any) => {
      const expectedEnd = new Date(s.expected_end_at).getTime();
      const timeToEnd = expectedEnd - now;
      let healthStatus: ActiveAvatarSession['healthStatus'] = 'healthy';
      if (timeToEnd < 0) healthStatus = 'overdue';
      else if (timeToEnd < 15 * 60000) healthStatus = 'warning'; // <15min left

      return {
        id: s.id,
        accountLabel: s.linkedin_avatar_accounts?.label || 'Unknown',
        accountAvatarUrl: s.linkedin_avatar_accounts?.avatar_url || null,
        operatorName: s.profiles?.full_name || 'Unknown',
        jobTitle: s.jobs?.title || null,
        companyName: s.jobs?.companies?.name || null,
        startedAt: s.started_at,
        expectedEndAt: s.expected_end_at,
        riskLevel: s.linkedin_avatar_accounts?.risk_level || null,
        healthStatus,
      };
    });

    setActiveSessions(sessions);
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadPresence(), loadActiveSessions()]);
    setIsLoading(false);
  }, [loadPresence, loadActiveSessions]);

  useEffect(() => {
    loadAll();

    // Realtime subscriptions
    const presenceChannel = supabase
      .channel('live-ops-presence')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, () => {
        loadPresence();
      })
      .subscribe();

    const sessionsChannel = supabase
      .channel('live-ops-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'linkedin_avatar_sessions' }, () => {
        loadActiveSessions();
      })
      .subscribe();

    // Refresh health statuses + durations every 60s
    const interval = setInterval(() => {
      loadActiveSessions();
    }, 60000);

    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(sessionsChannel);
      clearInterval(interval);
    };
  }, [loadAll, loadPresence, loadActiveSessions]);

  return { onlineMembers, offlineCount, activeSessions, isLoading };
}
