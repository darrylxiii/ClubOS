import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AgentDecision {
  id: string;
  agent_name: string;
  decision_type: string;
  decision_made: string;
  confidence_score: number | null;
  created_at: string | null;
  was_overridden: boolean | null;
}

export function useAgentDecisions() {
  return useQuery({
    queryKey: ['agent-decisions-recent'],
    queryFn: async (): Promise<AgentDecision[]> => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('agent_decision_log')
        .select('id, agent_name, decision_type, decision_made, confidence_score, created_at, was_overridden')
        .gte('created_at', yesterday)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;
      return (data || []) as AgentDecision[];
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}
