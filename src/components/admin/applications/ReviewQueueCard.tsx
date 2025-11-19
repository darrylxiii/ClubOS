import { Clock } from "lucide-react";
import { MetricCard } from "../shared/MetricCard";
import { useApplicationMetrics } from "@/hooks/useApplicationMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { Badge } from "@/components/ui/badge";

export const ReviewQueueCard = () => {
  const { metrics, isLoading } = useApplicationMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  return (
    <MetricCard
      title="Review Queue"
      description="Pending review"
      icon={Clock}
      iconColor={metrics.critical_pending > 0 ? "critical" : "warning"}
      primaryMetric={metrics.pending_review}
      secondaryText="Applications awaiting review"
    >
      {metrics.critical_pending > 0 && (
        <Badge variant="destructive" className="mt-2">
          {metrics.critical_pending} critical (&gt;48h)
        </Badge>
      )}
    </MetricCard>
  );
};
