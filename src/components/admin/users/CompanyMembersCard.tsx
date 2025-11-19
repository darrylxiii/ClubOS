import { Building2 } from "lucide-react";
import { MetricCard } from "../shared/MetricCard";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";

export const CompanyMembersCard = () => {
  const { metrics, isLoading } = useUserMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  const candidateCount = metrics.total_users - metrics.company_members;

  return (
    <MetricCard
      title="Company Members"
      description="Linked to companies"
      icon={Building2}
      iconColor="info"
      primaryMetric={metrics.company_members.toLocaleString()}
      secondaryText={`${candidateCount} candidates (no company)`}
    />
  );
};
