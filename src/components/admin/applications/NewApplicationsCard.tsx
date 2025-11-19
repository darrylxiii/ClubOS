import { TrendingUp } from "lucide-react";
import { MetricCard } from "../shared/MetricCard";
import { useApplicationMetrics } from "@/hooks/useApplicationMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { Badge } from "@/components/ui/badge";

export const NewApplicationsCard = () => {
  const { metrics, isLoading } = useApplicationMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  return (
    <MetricCard
      title="New Today"
      description="Applications received"
      icon={TrendingUp}
      iconColor="success"
      primaryMetric={metrics.new_today}
      secondaryText="Applications today"
    >
      <Badge variant="secondary" className="mt-2">
        Active Pipeline
      </Badge>
    </MetricCard>
  );
};
