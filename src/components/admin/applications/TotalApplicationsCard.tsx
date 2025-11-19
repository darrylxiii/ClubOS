import { FileText } from "lucide-react";
import { MetricCard } from "../shared/MetricCard";
import { useApplicationMetrics } from "@/hooks/useApplicationMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { Progress } from "@/components/ui/progress";

export const TotalApplicationsCard = () => {
  const { metrics, isLoading } = useApplicationMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  const processedRate = metrics.total_applications > 0
    ? ((metrics.approved + metrics.rejected) / metrics.total_applications) * 100
    : 0;

  return (
    <MetricCard
      title="Total Applications"
      description="Last 90 days"
      icon={FileText}
      iconColor="info"
      primaryMetric={metrics.total_applications.toLocaleString()}
      secondaryText={`${metrics.approved} approved • ${metrics.rejected} rejected`}
    >
      <Progress value={processedRate} className="h-2 mt-2" />
      <p className="text-xs text-muted-foreground mt-1">
        {processedRate.toFixed(1)}% processed
      </p>
    </MetricCard>
  );
};
