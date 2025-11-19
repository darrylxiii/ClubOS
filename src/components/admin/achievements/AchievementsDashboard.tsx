import { DashboardHeader } from "../shared/DashboardHeader";
import { Trophy, Star } from "lucide-react";
import { MetricCard } from "../shared/MetricCard";
import { useAchievementMetrics } from "@/hooks/useAchievementMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { useQueryClient } from "@tanstack/react-query";

export const AchievementsDashboard = () => {
  const queryClient = useQueryClient();
  const { metrics, topAchievements, isLoading } = useAchievementMetrics();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['achievement-'] });
  };

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <DashboardHeader title="Achievements" description="Platform achievements" onRefresh={handleRefresh} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>
    );
  }

  const avgPerUser = metrics.unique_users_with_achievements > 0
    ? (metrics.total_unlocks / metrics.unique_users_with_achievements).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Achievement System"
        description="Manage platform achievements and gamification"
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Achievements"
          icon={Trophy}
          iconColor="warning"
          primaryMetric={metrics.total_achievements}
          secondaryText={`${metrics.active_achievements} active • ${metrics.disabled_achievements} disabled`}
        />
        <MetricCard
          title="User Unlocks"
          icon={Star}
          iconColor="success"
          primaryMetric={metrics.total_unlocks.toLocaleString()}
          secondaryText={`${metrics.unique_users_with_achievements} users with achievements`}
        >
          <p className="text-xs text-muted-foreground mt-2">
            Avg {avgPerUser} per user
          </p>
        </MetricCard>
        <MetricCard
          title="Most Unlocked"
          icon={Star}
          iconColor="info"
          primaryMetric={topAchievements?.[0]?.unlock_count || 0}
          secondaryText={topAchievements?.[0]?.achievement_name || "No data"}
        />
      </div>
    </div>
  );
};
