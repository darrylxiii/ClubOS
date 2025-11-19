import { Briefcase } from "lucide-react";
import { MetricCard } from "../shared/MetricCard";
import { useCompanyMetrics } from "@/hooks/useCompanyMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";

export const TotalJobsCard = () => {
  const { metrics, topByJobs, isLoading } = useCompanyMetrics();

  if (isLoading || !metrics) {
    return <MetricCardSkeleton />;
  }

  return (
    <MetricCard
      title="Total Jobs"
      description="Job postings"
      icon={Briefcase}
      iconColor="success"
      primaryMetric={metrics.total_jobs}
      secondaryText={`${metrics.active_jobs} active`}
    >
      {topByJobs && topByJobs.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs text-muted-foreground mb-2">Top Companies</div>
          <div className="space-y-1">
            {topByJobs.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="truncate">{item.company_name}</span>
                <span className="text-muted-foreground">{item.job_count} jobs</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </MetricCard>
  );
};
