import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

export interface AgentContext {
  memories: any[];
  preferences: any[];
  workingMemory: any[];
  activeGoals: any[];
  recentDecisions: any[];
  predictiveSignals: any[];
  contextTimestamp: string;
}

export function useAgentContext(sessionId?: string) {
  const { user } = useAuth();
  const location = useLocation();

  return useQuery({
    queryKey: ['agent-context', user?.id, sessionId],
    queryFn: async (): Promise<AgentContext> => {
      if (!user?.id) throw new Error('No user');

      const { data, error } = await supabase.functions.invoke('agent-memory-manager', {
        body: {
          operation: 'get_context',
          userId: user.id,
          data: { sessionId, currentRoute: location.pathname }
        }
      });

      if (error) throw error;
      return data.context;
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useAgentGoals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agent-goals', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');

      const { data, error } = await supabase
        .from('agent_goals')
        .select('*, agent_goal_progress(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('priority', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useAgentRegistry() {
  return useQuery({
    queryKey: ['agent-registry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_registry')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
  });
}
