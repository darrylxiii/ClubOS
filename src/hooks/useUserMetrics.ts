import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UserMetrics {
  total_users: number;
  verified_users: number;
  pending_verification: number;
  users_with_roles: number;
  company_members: number;
  new_users_7d: number;
}

interface RoleDistribution {
  role: string;
  user_count: number;
}

export const useUserMetrics = () => {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['user-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_metrics');
      if (error) throw error;
      return data as any as UserMetrics;
    },
    refetchInterval: 60000,
  });

  const { data: roleDistribution, isLoading: rolesLoading } = useQuery({
    queryKey: ['role-distribution'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_role_distribution');
      if (error) throw error;
      return data as any as RoleDistribution[];
    },
    refetchInterval: 300000,
  });

  return {
    metrics,
    roleDistribution,
    isLoading: metricsLoading || rolesLoading,
  };
};
