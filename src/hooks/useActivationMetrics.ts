import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface ActivationEvent {
  id: string;
  user_id: string | null;
  company_id: string | null;
  event_type: string;
  event_category: 'signup' | 'onboarding' | 'engagement' | 'conversion' | 'retention' | 'referral';
  milestone_name: string | null;
  milestone_order: number | null;
  event_data: Json;
  session_id: string | null;
  source: string | null;
  created_at: string;
}

export interface ActivationFunnelStep {
  step: string;
  milestone: string;
  count: number;
  conversionRate: number;
  dropoffRate: number;
}

// Standard activation milestones
export const ACTIVATION_MILESTONES = {
  SIGNUP: { name: 'signup_complete', order: 1, category: 'signup' as const },
  PROFILE_60: { name: 'profile_60_percent', order: 2, category: 'onboarding' as const },
  CV_UPLOADED: { name: 'cv_uploaded', order: 3, category: 'onboarding' as const },
  PREFERENCES_SET: { name: 'preferences_set', order: 4, category: 'onboarding' as const },
  CALENDAR_CONNECTED: { name: 'calendar_connected', order: 5, category: 'onboarding' as const },
  FIRST_MATCH: { name: 'first_match_viewed', order: 6, category: 'engagement' as const },
  FIRST_APPLY: { name: 'first_application', order: 7, category: 'conversion' as const },
  FIRST_INTERVIEW: { name: 'first_interview', order: 8, category: 'conversion' as const },
  FIRST_HIRE: { name: 'first_hire', order: 9, category: 'conversion' as const },
};

export function useActivationEvents(userId?: string, category?: string) {
  return useQuery({
    queryKey: ['activation-events', userId, category],
    queryFn: async (): Promise<ActivationEvent[]> => {
      let query = supabase
        .from('activation_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) query = query.eq('user_id', userId);
      if (category) query = query.eq('event_category', category);

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return (data || []) as ActivationEvent[];
    },
    staleTime: 30000,
  });
}

export function useActivationFunnel(days: number = 30) {
  return useQuery({
    queryKey: ['activation-funnel', days],
    queryFn: async (): Promise<ActivationFunnelStep[]> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get counts for each milestone
      const { data, error } = await supabase
        .from('activation_events')
        .select('milestone_name, user_id')
        .gte('created_at', startDate.toISOString())
        .in('milestone_name', Object.values(ACTIVATION_MILESTONES).map(m => m.name));

      if (error) throw error;

      // Count unique users per milestone
      const milestoneCounts: Record<string, Set<string>> = {};
      (data || []).forEach((event) => {
        if (event.milestone_name && event.user_id) {
          if (!milestoneCounts[event.milestone_name]) {
            milestoneCounts[event.milestone_name] = new Set();
          }
          milestoneCounts[event.milestone_name].add(event.user_id);
        }
      });

      // Build funnel steps
      const milestones = Object.values(ACTIVATION_MILESTONES).sort((a, b) => a.order - b.order);
      const funnelSteps: ActivationFunnelStep[] = [];
      let previousCount = 0;

      milestones.forEach((milestone, index) => {
        const count = milestoneCounts[milestone.name]?.size || 0;
        const baseCount = index === 0 ? count : previousCount;

        funnelSteps.push({
          step: `Step ${milestone.order}`,
          milestone: milestone.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          count,
          conversionRate: baseCount > 0 ? (count / baseCount) * 100 : 0,
          dropoffRate: baseCount > 0 ? ((baseCount - count) / baseCount) * 100 : 0,
        });

        if (index === 0) previousCount = count;
        else previousCount = count;
      });

      return funnelSteps;
    },
    staleTime: 60000,
  });
}

export function useTimeToActivation(milestone: string, days: number = 30) {
  return useQuery({
    queryKey: ['time-to-activation', milestone, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get signup events
      const { data: signups } = await supabase
        .from('activation_events')
        .select('user_id, created_at')
        .eq('milestone_name', ACTIVATION_MILESTONES.SIGNUP.name)
        .gte('created_at', startDate.toISOString());

      // Get target milestone events
      const { data: targets } = await supabase
        .from('activation_events')
        .select('user_id, created_at')
        .eq('milestone_name', milestone)
        .gte('created_at', startDate.toISOString());

      if (!signups || !targets) return { avgHours: 0, medianHours: 0, count: 0 };

      // Calculate time differences
      const validSignups = signups.filter(s => s.user_id) as { user_id: string, created_at: string }[];
      const signupMap = new Map<string, Date>(validSignups.map(s => [s.user_id, new Date(s.created_at)]));
      const times: number[] = [];

      targets.forEach(t => {
        if (!t.user_id) return;
        const signupTime = signupMap.get(t.user_id as string);
        if (signupTime && t.created_at) {
          const diff = (new Date(t.created_at).getTime() - signupTime.getTime()) / (1000 * 60 * 60);
          if (diff > 0) times.push(diff);
        }
      });

      if (times.length === 0) return { avgHours: 0, medianHours: 0, count: 0 };

      times.sort((a, b) => a - b);
      const avgHours = times.reduce((a, b) => a + b, 0) / times.length;
      const medianHours = times[Math.floor(times.length / 2)];

      return { avgHours, medianHours, count: times.length };
    },
    staleTime: 60000,
  });
}

export function useTimeToMilestone(days: number = 30) {
  return useQuery({
    queryKey: ['time-to-milestone', days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get signup events
      const { data: signups } = await supabase
        .from('activation_events')
        .select('user_id, created_at')
        .eq('milestone_name', ACTIVATION_MILESTONES.SIGNUP.name)
        .gte('created_at', startDate.toISOString());

      // Get all milestone events
      const { data: events } = await supabase
        .from('activation_events')
        .select('user_id, milestone_name, created_at')
        .gte('created_at', startDate.toISOString())
        .in('milestone_name', Object.values(ACTIVATION_MILESTONES).map(m => m.name));

      if (!signups || !events) return [];

      const validSignups = signups.filter(s => s.user_id) as { user_id: string, created_at: string }[];
      const signupMap = new Map<string, Date>(validSignups.map(s => [s.user_id, new Date(s.created_at)]));
      const milestoneStats: Record<string, { times: number[]; count: number }> = {};

      events.forEach(e => {
        if (!e.milestone_name) return;
        const signupTime = signupMap.get(e.user_id);
        if (!milestoneStats[e.milestone_name]) {
          milestoneStats[e.milestone_name] = { times: [], count: 0 };
        }
        milestoneStats[e.milestone_name].count++;
        if (signupTime && e.created_at) {
          const diff = (new Date(e.created_at).getTime() - signupTime.getTime()) / (1000 * 60 * 60);
          if (diff > 0) milestoneStats[e.milestone_name].times.push(diff);
        }
      });

      return Object.entries(milestoneStats).map(([milestone, stats]) => ({
        milestone: milestone.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        avgHours: stats.times.length > 0 ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length : 0,
        count: stats.count,
      }));
    },
    staleTime: 60000,
  });
}

export function useTrackActivationEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventType,
      eventCategory,
      milestoneName,
      eventData,
    }: {
      eventType: string;
      eventCategory: ActivationEvent['event_category'];
      milestoneName?: string;
      eventData?: Json;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      const { data, error } = await supabase
        .from('activation_events')
        .insert([{
          user_id: userId,
          event_type: eventType,
          event_category: eventCategory,
          milestone_name: milestoneName,
          event_data: eventData || {},
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activation-events'] });
      queryClient.invalidateQueries({ queryKey: ['activation-funnel'] });
    },
  });
}
