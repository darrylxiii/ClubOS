import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, AlertCircle, CheckCircle, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutiveSummaryBarProps {
  overallHealth: number;
  criticalCount: number;
  warningCount: number;
  onTargetCount: number;
  onTargetPercentage: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function ExecutiveSummaryBar({
  overallHealth,
  criticalCount,
  warningCount,
  onTargetCount,
  onTargetPercentage,
  isRefreshing,
  onRefresh,
}: ExecutiveSummaryBarProps) {
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-rose-500/10 border-rose-500/20';
  };

  return (
    <div className="w-full bg-card/50 backdrop-blur-sm border-b border-border/50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              Platform Health
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-6">
            {/* Health Score */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border",
              getHealthBg(overallHealth)
            )}>
              <span className={cn("text-2xl font-bold", getHealthColor(overallHealth))}>
                {overallHealth}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>

            {/* Critical Alerts */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border",
              criticalCount > 0 ? "bg-rose-500/10 border-rose-500/20" : "bg-muted/50 border-border/50"
            )}>
              <AlertCircle className={cn(
                "h-4 w-4",
                criticalCount > 0 ? "text-rose-500" : "text-muted-foreground"
              )} />
              <span className={cn(
                "font-bold",
                criticalCount > 0 ? "text-rose-500" : "text-muted-foreground"
              )}>
                {criticalCount}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">Critical</span>
            </div>

            {/* Warnings */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border",
              warningCount > 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-muted/50 border-border/50"
            )}>
              <AlertTriangle className={cn(
                "h-4 w-4",
                warningCount > 0 ? "text-amber-500" : "text-muted-foreground"
              )} />
              <span className={cn(
                "font-bold",
                warningCount > 0 ? "text-amber-500" : "text-muted-foreground"
              )}>
                {warningCount}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">Warning</span>
            </div>

            {/* On Target */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-emerald-500/10 border-emerald-500/20">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="font-bold text-emerald-500">{onTargetCount}</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                ({onTargetPercentage}%)
              </span>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
