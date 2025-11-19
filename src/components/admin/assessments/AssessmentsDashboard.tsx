import { DashboardHeader } from "../shared/DashboardHeader";
import { FileText, TrendingUp, CheckCircle2 } from "lucide-react";
import { MetricCard } from "../shared/MetricCard";
import { useAssessmentMetrics } from "@/hooks/useAssessmentMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";

export const AssessmentsDashboard = () => {
  const queryClient = useQueryClient();
  const { metrics, isLoading } = useAssessmentMetrics();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['assessment-'] });
  };

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <DashboardHeader title="Assessments" description="Assessment results" onRefresh={handleRefresh} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Assessment Results"
        description="Track candidate assessments and scores"
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Completed"
          icon={FileText}
          iconColor="info"
          primaryMetric={metrics.total_completed.toLocaleString()}
          secondaryText={`${metrics.in_progress} in progress • ${metrics.pending} pending`}
        />
        <MetricCard
          title="Average Score"
          icon={TrendingUp}
          iconColor="success"
          primaryMetric={`${metrics.average_score}/10`}
          secondaryText="Overall performance"
        >
          <Progress value={metrics.average_score * 10} className="h-2 mt-2" />
        </MetricCard>
        <MetricCard
          title="Pass Rate"
          icon={CheckCircle2}
          iconColor="success"
          primaryMetric={`${metrics.pass_rate}%`}
          secondaryText="70% threshold"
        >
          <Progress value={metrics.pass_rate} className="h-2 mt-2" />
        </MetricCard>
      </div>
    </div>
  );
};
