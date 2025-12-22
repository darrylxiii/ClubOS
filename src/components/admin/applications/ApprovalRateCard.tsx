import { useApplicationMetrics } from "@/hooks/useApplicationMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { AnimatedCard, CardVisual, CardBody, CardTitle, CardDescription } from "@/components/ui/animated-card";
import { Visual3 } from "@/components/ui/visual-3";
import { TrendingUp } from "lucide-react";

export const ApprovalRateCard = () => {
  const { metrics, isLoading } = useApplicationMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  // Mock trend data
  const trend = "+4.2%";

  return (
    <AnimatedCard>
      <CardVisual>
        <Visual3 mainColor="#10b981" secondaryColor="#14b8a6" />
      </CardVisual>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardDescription>Approval Rate (90d)</CardDescription>
            <CardTitle>{metrics.approval_rate}%</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            {trend}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {metrics.approved} approved applications
        </p>
        <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-teal-500 transition-all duration-500"
            style={{ width: `${metrics.approval_rate}%` }}
          />
        </div>
      </CardBody>
    </AnimatedCard>
  );
};

