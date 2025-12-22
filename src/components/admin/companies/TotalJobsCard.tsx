import { useCompanyMetrics } from "@/hooks/useCompanyMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { AnimatedCard, CardVisual, CardBody, CardTitle, CardDescription } from "@/components/ui/animated-card";
import { Visual1 } from "@/components/ui/visual-1";
import { TrendingUp } from "lucide-react";

export const TotalJobsCard = () => {
  const { metrics, topByJobs, isLoading } = useCompanyMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  // Mock trend data
  const trend = "+8.7%";

  return (
    <AnimatedCard>
      <CardVisual>
        <Visual1 mainColor="#10b981" secondaryColor="#14b8a6" />
      </CardVisual>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardDescription>Total Jobs</CardDescription>
            <CardTitle>{metrics.total_jobs}</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            {trend}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {metrics.active_jobs} active positions
        </p>
        {topByJobs && topByJobs.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
            {topByJobs.slice(0, 2).map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="truncate text-foreground/80">{item.company_name}</span>
                <span className="text-muted-foreground font-medium">{item.job_count}</span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </AnimatedCard>
  );
};

