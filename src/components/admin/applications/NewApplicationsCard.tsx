import { useApplicationMetrics } from "@/hooks/useApplicationMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { AnimatedCard, CardVisual, CardBody, CardTitle, CardDescription } from "@/components/ui/animated-card";
import { Visual1 } from "@/components/ui/visual-1";
import { TrendingUp } from "lucide-react";

export const NewApplicationsCard = () => {
  const { metrics, isLoading } = useApplicationMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  // Mock trend data
  const trend = "+42.1%";

  return (
    <AnimatedCard>
      <CardVisual>
        <Visual1 mainColor="#0ea5e9" secondaryColor="#3b82f6" />
      </CardVisual>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardDescription>New Today</CardDescription>
            <CardTitle>{metrics.new_today}</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            {trend}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Applications received today
        </p>
        <div className="mt-3 inline-flex items-center px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Active Pipeline</span>
        </div>
      </CardBody>
    </AnimatedCard>
  );
};

