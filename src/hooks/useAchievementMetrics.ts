import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AchievementMetrics {
  total_achievements: number;
  active_achievements: number;
  disabled_achievements: number;
  total_unlocks: number;
  unique_users_with_achievements: number;
  new_this_month: number;
}

interface TopAchievement {
  achievement_id: string;
  achievement_name: string;
  unlock_count: number;
}

export const useAchievementMetrics = () => {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['achievement-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_achievement_metrics');
      if (error) throw error;
      return data as any as AchievementMetrics;
    },
    refetchInterval: 60000,
  });

  const { data: topAchievements, isLoading: topLoading } = useQuery({
    queryKey: ['top-achievements'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_achievements_by_unlocks', { limit_count: 5 });
      if (error) throw error;
      return data as any as TopAchievement[];
    },
    refetchInterval: 300000,
  });

  return {
    metrics,
    topAchievements,
    isLoading: metricsLoading || topLoading,
  };
};
