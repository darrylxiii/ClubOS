import { CheckCircle2 } from "lucide-react";
import { MetricCard } from "../shared/MetricCard";
import { useApplicationMetrics } from "@/hooks/useApplicationMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { Progress } from "@/components/ui/progress";

export const ApprovalRateCard = () => {
  const { metrics, isLoading } = useApplicationMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  return (
    <MetricCard
      title="Approval Rate"
      description="Last 90 days"
      icon={CheckCircle2}
      iconColor="success"
      primaryMetric={`${metrics.approval_rate}%`}
      secondaryText={`${metrics.approved} approved applications`}
    >
      <Progress value={metrics.approval_rate} className="h-2 mt-2" />
    </MetricCard>
  );
};
