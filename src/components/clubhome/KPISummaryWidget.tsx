import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, AlertTriangle, CheckCircle, TrendingUp, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface KPIStats {
  healthScore: number | null;
  criticalAlerts: number;
  warningAlerts: number;
  onTargetCount: number;
  pendingCount: number;
  hasData: boolean;
}

export const KPISummaryWidget = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['kpi-summary-stats'],
    queryFn: async (): Promise<KPIStats> => {
      // Fetch KPI metrics using actual columns from types
      const { data: metrics, error } = await supabase
        .from('kpi_metrics')
        .select('value, previous_value, trend_direction')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching KPI stats:', error);
        throw error;
      }

      if (!metrics || metrics.length === 0) {
        return {
          healthScore: null,
          criticalAlerts: 0,
          warningAlerts: 0,
          onTargetCount: 0,
          pendingCount: 0,
          hasData: false
        };
      }

      // Calculate status based on trend
      let criticalAlerts = 0;
      let warningAlerts = 0;
      let onTargetCount = 0;
      let pendingCount = 0;

      metrics.forEach(m => {
        const trend = m.trend_direction;
        if (trend === 'up' || trend === 'stable') onTargetCount++;
        else if (trend === 'down') warningAlerts++;
        else if (trend === null || trend === undefined) pendingCount++;
        else criticalAlerts++;
      });
      
      // Health score based only on metrics WITH trend data
      const metricsWithTrend = metrics.length - pendingCount;
      const healthScore = metricsWithTrend > 0 
        ? Math.round((onTargetCount / metricsWithTrend) * 100)
        : null;

      return {
        healthScore: healthScore !== null ? Math.min(healthScore, 100) : null,
        criticalAlerts,
        warningAlerts,
        onTargetCount,
        pendingCount,
        hasData: true
      };
    },
    staleTime: 60000, // 1 minute
  });

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (isLoading) {
    return (
      <Card className="glass-card h-full flex flex-col">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="flex-1">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no data
  if (!stats?.hasData) {
    return (
      <Card className="glass-card h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            KPI Health
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Info className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">No KPI data available yet</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/kpi-command-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Set Up KPIs
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          KPI Health
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Based on {stats.criticalAlerts + stats.warningAlerts + stats.onTargetCount} tracked metrics</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            {stats.healthScore !== null ? (
              <>
                <div className={`text-4xl font-bold ${getHealthColor(stats.healthScore)}`}>
                  {stats.healthScore}%
                </div>
                <div className="text-xs text-muted-foreground text-center">Health Score</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">—</div>
                <div className="text-xs text-muted-foreground text-center">Awaiting Data</div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="flex flex-col items-center p-2 rounded-lg bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-500 mb-1" />
            <span className="text-lg font-bold text-red-500">{stats.criticalAlerts}</span>
            <span className="text-xs text-muted-foreground">Critical</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mb-1" />
            <span className="text-lg font-bold text-yellow-500">{stats.warningAlerts}</span>
            <span className="text-xs text-muted-foreground">Warning</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500 mb-1" />
            <span className="text-lg font-bold text-green-500">{stats.onTargetCount}</span>
            <span className="text-xs text-muted-foreground">On Target</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Info className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="text-lg font-bold text-muted-foreground">{stats.pendingCount}</span>
            <span className="text-xs text-muted-foreground">Pending</span>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/admin/kpi-command-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            View All KPIs
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
