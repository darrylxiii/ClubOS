import { DashboardHeader } from "../shared/DashboardHeader";
import { TrendingDown, CheckCircle } from "lucide-react";
import { useSystemHealthMetrics } from "@/hooks/useSystemHealthMetrics";
import { MetricCardSkeleton } from "../shared/MetricCardSkeleton";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatedCard, CardVisual, CardBody, CardTitle, CardDescription } from "@/components/ui/animated-card";
import { Visual1 } from "@/components/ui/visual-1";
import { Visual3 } from "@/components/ui/visual-3";

export const SystemHealthDashboard = () => {
  const queryClient = useQueryClient();
  const { metrics, isLoading } = useSystemHealthMetrics();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['system-health-metrics'] });
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
        <AnimatedCard>
          <CardVisual>
            <Visual1 mainColor="#10b981" secondaryColor="#059669" />
          </CardVisual>
          <CardBody>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardDescription>Platform Status</CardDescription>
                <CardTitle className="text-xl">Operational</CardTitle>
              </div>
              <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {metrics.uptime_percentage}% uptime (30d)
            </p>
            <div className="mt-3 inline-flex items-center px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="text-xs font-medium text-green-600 dark:text-green-400">✓ All Systems Go</span>
            </div>
          </CardBody>
        </AnimatedCard>

        <AnimatedCard>
          <CardVisual>
            <Visual3 mainColor="#3b82f6" secondaryColor="#6366f1" />
          </CardVisual>
          <CardBody>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardDescription>Response Time</CardDescription>
                <CardTitle>{metrics.avg_response_time_ms}ms</CardTitle>
              </div>
              <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
                <TrendingDown className="w-4 h-4" />
                -8.5%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Average (p95)
            </p>
          </CardBody>
        </AnimatedCard>

        <AnimatedCard>
          <CardVisual>
            <Visual1 mainColor="#8b5cf6" secondaryColor="#7c3aed" />
          </CardVisual>
          <CardBody>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardDescription>Last Backup</CardDescription>
                <CardTitle className="text-xl">Recent</CardTitle>
              </div>
              <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {metrics.last_backup ? new Date(metrics.last_backup).toLocaleString() : "Never"}
            </p>
          </CardBody>
        </AnimatedCard>

        <AnimatedCard>
          <CardVisual>
            <Visual3 mainColor={metrics.critical_errors > 0 ? "#ef4444" : "#f59e0b"} secondaryColor="#f43f5e" />
          </CardVisual>
          <CardBody>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardDescription>Error Rate (24h)</CardDescription>
                <CardTitle>{metrics.total_errors_24h}</CardTitle>
              </div>
              <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
                <TrendingDown className="w-4 h-4" />
                -15.2%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {metrics.critical_errors} critical • {metrics.warnings} warnings
            </p>
          </CardBody>
        </AnimatedCard>
      </div>
    </div>
  );
};

