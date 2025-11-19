import { Building2 } from "lucide-react";
import { MetricCard } from "../shared/MetricCard";
import { useCompanyMetrics } from "@/hooks/useCompanyMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { Progress } from "@/components/ui/progress";

export const TotalCompaniesCard = () => {
  const { metrics, isLoading } = useCompanyMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  const activeRate = metrics.total_companies > 0
    ? (metrics.active_companies / metrics.total_companies) * 100
    : 0;

  return (
    <MetricCard
      title="Total Companies"
      description="Company accounts"
      icon={Building2}
      iconColor="info"
      primaryMetric={metrics.total_companies}
      secondaryText={`${metrics.active_companies} active • ${metrics.inactive_companies} inactive`}
    >
      <Progress value={activeRate} className="h-2 mt-2" />
      <p className="text-xs text-muted-foreground mt-1">
        {activeRate.toFixed(1)}% active rate
      </p>
    </MetricCard>
  );
};
