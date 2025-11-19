import { TrendingUp } from "lucide-react";
import { MetricCard } from "../shared/MetricCard";
import { useCompanyMetrics } from "@/hooks/useCompanyMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";

export const CompanyFollowersCard = () => {
  const { metrics, topByFollowers, isLoading } = useCompanyMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  return (
    <MetricCard
      title="Followers"
      description="Company followers"
      icon={TrendingUp}
      iconColor="success"
      primaryMetric={metrics.total_followers.toLocaleString()}
      secondaryText="Total followers"
    >
      {topByFollowers && topByFollowers.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs text-muted-foreground mb-2">Most Followed</div>
          <div className="space-y-1">
            {topByFollowers.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="truncate">{item.company_name}</span>
                <span className="text-muted-foreground">{item.follower_count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </MetricCard>
  );
};
