import { Users } from "lucide-react";
import { MetricCard } from "../shared/MetricCard";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { Progress } from "@/components/ui/progress";

export const TotalUsersCard = () => {
  const { metrics, isLoading } = useUserMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  const verificationRate = metrics.total_users > 0
    ? (metrics.verified_users / metrics.total_users) * 100
    : 0;

  return (
    <MetricCard
      title="Total Users"
      description="User accounts"
      icon={Users}
      iconColor="info"
      primaryMetric={metrics.total_users.toLocaleString()}
      secondaryText={`${metrics.verified_users} verified • ${metrics.pending_verification} pending`}
    >
      <Progress value={verificationRate} className="h-2 mt-2" />
      <p className="text-xs text-muted-foreground mt-1">
        {verificationRate.toFixed(1)}% verified
      </p>
    </MetricCard>
  );
};
