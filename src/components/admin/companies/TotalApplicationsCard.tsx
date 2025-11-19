import { Users } from "lucide-react";
import { MetricCard } from "../shared/MetricCard";
import { useCompanyMetrics } from "@/hooks/useCompanyMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";

export const TotalApplicationsCard = () => {
  const { metrics, isLoading } = useCompanyMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  return (
    <MetricCard
      title="Applications"
      description="Total applications"
      icon={Users}
      iconColor="warning"
      primaryMetric={metrics.total_applications.toLocaleString()}
      secondaryText="Across all companies"
    />
  );
};
