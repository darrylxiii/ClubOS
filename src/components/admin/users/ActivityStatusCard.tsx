import { Activity } from "lucide-react";
import { MetricCard } from "../shared/MetricCard";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { Badge } from "@/components/ui/badge";

export const ActivityStatusCard = () => {
  const { metrics, isLoading } = useUserMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  return (
    <MetricCard
      title="Recent Activity"
      description="Last 7 days"
      icon={Activity}
      iconColor="warning"
      primaryMetric={metrics.new_users_7d}
      secondaryText="New users this week"
    >
      <Badge variant="secondary" className="mt-2">
        Active Growth
      </Badge>
    </MetricCard>
  );
};
