import { useUserMetrics } from "@/hooks/useUserMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { AnimatedCard, CardVisual, CardBody, CardTitle, CardDescription } from "@/components/ui/animated-card";
import { Visual1 } from "@/components/ui/visual-1";
import { TrendingUp } from "lucide-react";

export const CompanyMembersCard = () => {
  const { metrics, isLoading } = useUserMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  const candidateCount = metrics.total_users - metrics.company_members;

  // Mock trend data
  const trend = "+9.8%";

  return (
    <AnimatedCard>
      <CardVisual>
        <Visual1 mainColor="#6366f1" secondaryColor="#8b5cf6" />
      </CardVisual>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardDescription>Company Members</CardDescription>
            <CardTitle>{metrics.company_members.toLocaleString()}</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            {trend}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {candidateCount.toLocaleString()} independent candidates
        </p>
      </CardBody>
    </AnimatedCard>
  );
};

