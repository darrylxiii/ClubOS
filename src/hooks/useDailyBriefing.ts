import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DailyBriefing {
  id: string;
  briefing_date: string;
  content: {
    summary: {
      active_signals: number;
      stalled_candidates: number;
      agent_decisions_24h: number;
      new_applications_24h: number;
      meetings_today: number;
    };
    agentic_stats: {
      heartbeat_runs: number;
      events_processed: number;
      signals_detected: number;
      tasks_auto_created: number;
      errors: number;
    };
    top_actions: string[];
    top_signals: Array<{ type: string; entity: string; strength: number; action: string }>;
    meetings: Array<{ title: string; time: string; participants: number }>;
    recent_agent_actions: Array<{ agent: string; action: string; confidence: number }>;
  };
  is_dismissed: boolean;
}

export function useDailyBriefing() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['daily-briefing', user?.id, today],
    queryFn: async (): Promise<DailyBriefing | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('daily_briefings')
        .select('*')
        .eq('user_id', user.id)
        .eq('briefing_date', today)
        .eq('is_dismissed', false)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as DailyBriefing | null;
    },
    enabled: !!user?.id,
    staleTime: 300000,
  });
}

export function useDismissBriefing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (briefingId: string) => {
      const { error } = await supabase
        .from('daily_briefings')
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', briefingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-briefing'] });
    },
  });
}
