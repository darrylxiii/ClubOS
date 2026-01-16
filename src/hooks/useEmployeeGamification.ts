import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EmployeeGamification {
  userId: string;
  totalXp: number;
  currentLevel: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  xpToNextLevel: number;
  levelProgress: number;
}

export interface EmployeeMilestone {
  id: string;
  milestoneType: string;
  milestoneValue: number | null;
  unlockedAt: string;
  xpAwarded: number;
}

export interface XpEvent {
  id: string;
  eventType: string;
  xpAmount: number;
  description: string | null;
  createdAt: string;
}

const LEVEL_THRESHOLDS = {
  Scout: { min: 0, max: 499 },
  Closer: { min: 500, max: 1999 },
  Strategist: { min: 2000, max: 4999 },
  Elite: { min: 5000, max: 14999 },
  Legend: { min: 15000, max: 999999 },
};

export function useEmployeeGamification(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['employee-gamification', targetUserId],
    queryFn: async (): Promise<EmployeeGamification> => {
      if (!targetUserId) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('employee_gamification')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) throw error;

      const totalXp = data?.total_xp || 0;
      const currentLevel = data?.current_level || 'Scout';
      const threshold = LEVEL_THRESHOLDS[currentLevel as keyof typeof LEVEL_THRESHOLDS] || LEVEL_THRESHOLDS.Scout;
      const xpInLevel = totalXp - threshold.min;
      const levelRange = threshold.max - threshold.min + 1;
      const levelProgress = Math.min((xpInLevel / levelRange) * 100, 100);
      const xpToNextLevel = Math.max(threshold.max + 1 - totalXp, 0);

      return {
        userId: targetUserId,
        totalXp,
        currentLevel,
        currentStreak: data?.current_streak || 0,
        longestStreak: data?.longest_streak || 0,
        lastActivityDate: data?.last_activity_date ?? null,
        xpToNextLevel,
        levelProgress,
      };
    },
    enabled: !!targetUserId,
    staleTime: 60000,
  });
}

export function useEmployeeMilestones(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['employee-milestones', targetUserId],
    queryFn: async (): Promise<EmployeeMilestone[]> => {
      if (!targetUserId) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('employee_milestones')
        .select('*')
        .eq('user_id', targetUserId)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(m => ({
        id: m.id,
        milestoneType: m.milestone_type,
        milestoneValue: m.milestone_value ? Number(m.milestone_value) : null,
        unlockedAt: m.unlocked_at,
        xpAwarded: m.xp_awarded,
      }));
    },
    enabled: !!targetUserId,
  });
}

export function useRecentXpEvents(userId?: string, limit = 10) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['employee-xp-events', targetUserId, limit],
    queryFn: async (): Promise<XpEvent[]> => {
      if (!targetUserId) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('employee_xp_events')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(e => ({
        id: e.id,
        eventType: e.event_type,
        xpAmount: e.xp_amount,
        description: e.description,
        createdAt: e.created_at,
      }));
    },
    enabled: !!targetUserId,
  });
}

export const LEVEL_ICONS: Record<string, string> = {
  Scout: '🔍',
  Closer: '🎯',
  Strategist: '♟️',
  Elite: '⭐',
  Legend: '👑',
};
