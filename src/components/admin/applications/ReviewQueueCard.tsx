import { useApplicationMetrics } from "@/hooks/useApplicationMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { AnimatedCard, CardVisual, CardBody, CardTitle, CardDescription } from "@/components/ui/animated-card";
import { Visual3 } from "@/components/ui/visual-3";
import { TrendingDown, AlertCircle } from "lucide-react";

export const ReviewQueueCard = () => {
  const { metrics, isLoading } = useApplicationMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  // Mock trend data (negative is good for queue)
  const trend = "-12.3%";

  return (
    <AnimatedCard>
      <CardVisual>
        <Visual3 mainColor="#f59e0b" secondaryColor="#f97316" />
      </CardVisual>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardDescription>Review Queue</CardDescription>
            <CardTitle>{metrics.pending_review}</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
            <TrendingDown className="w-4 h-4" />
            {trend}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Pending review
        </p>
        {metrics.critical_pending > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              {metrics.critical_pending} critical (&gt;48h)
            </span>
          </div>
        )}
      </CardBody>
    </AnimatedCard>
  );
};

