import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TierLimitResult {
  allowed: boolean;
  limit: number;
  usage: number;
  remaining: number;
  tier: string;
}

export const useTierLimit = (limitType: string) => {
  const { user } = useAuth();

  return useQuery<TierLimitResult>({
    queryKey: ['tier-limit', user?.id, limitType],
    queryFn: async () => {
      if (!user) {
        return {
          allowed: false,
          limit: 0,
          usage: 0,
          remaining: 0,
          tier: 'free',
        };
      }

      const { data, error } = await supabase.rpc('check_tier_limit', {
        check_user_id: user.id,
        limit_type_param: limitType,
      });

      if (error) throw error;
      
      // Parse the JSONB result
      const result = data as unknown as TierLimitResult;
      return result;
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
  });
};
