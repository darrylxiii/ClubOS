import { DashboardHeader } from "../shared/DashboardHeader";
import { Activity, Database, Shield, AlertTriangle } from "lucide-react";
import { MetricCard } from "../shared/MetricCard";
import { useSystemHealthMetrics } from "@/hooks/useSystemHealthMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

export const SystemHealthDashboard = () => {
  const queryClient = useQueryClient();
  const { metrics, isLoading } = useSystemHealthMetrics();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['system-health-'] });
  };

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <DashboardHeader title="System Health" description="Platform health" onRefresh={handleRefresh} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCardSkeleton />
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
        title="System Health"
        description="Monitor platform health and data integrity"
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Platform Status"
          icon={Activity}
          iconColor="success"
          primaryMetric="Operational"
          secondaryText={`${metrics.uptime_percentage}% uptime (30d)`}
        >
          <Badge variant="secondary" className="mt-2 bg-green-500/10 text-green-500 border-green-500/20">
            ✓ All Systems Go
          </Badge>
        </MetricCard>
        <MetricCard
          title="Response Time"
          icon={Database}
          iconColor="info"
          primaryMetric={`${metrics.avg_response_time_ms}ms`}
          secondaryText="Average (p95)"
        />
        <MetricCard
          title="Last Backup"
          icon={Shield}
          iconColor="success"
          primaryMetric="Recent"
          secondaryText={metrics.last_backup ? new Date(metrics.last_backup).toLocaleString() : "Never"}
        />
        <MetricCard
          title="Error Rate"
          icon={AlertTriangle}
          iconColor={metrics.critical_errors > 0 ? "critical" : "neutral"}
          primaryMetric={metrics.total_errors_24h}
          secondaryText={`${metrics.critical_errors} critical • ${metrics.warnings} warnings`}
        />
      </div>
    </div>
  );
};
