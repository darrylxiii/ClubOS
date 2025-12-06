import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pin, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnifiedKPI } from '@/hooks/useUnifiedKPIs';
import { KPISparkline } from './KPISparkline';

interface PinnedKPIsSectionProps {
  pinnedKPIs: UnifiedKPI[];
  onUnpin: (kpiId: string) => void;
  onKPIClick: (kpi: UnifiedKPI) => void;
}

const statusColors = {
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  critical: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  neutral: 'bg-muted text-muted-foreground border-border',
};

export function PinnedKPIsSection({ pinnedKPIs, onUnpin, onKPIClick }: PinnedKPIsSectionProps) {
  if (pinnedKPIs.length === 0) return null;

  const formatValue = (kpi: UnifiedKPI) => {
    switch (kpi.format) {
      case 'percent':
        return `${kpi.value.toFixed(1)}%`;
      case 'currency':
        return `€${kpi.value.toFixed(0)}`;
      case 'hours':
        return `${kpi.value.toFixed(1)}h`;
      case 'days':
        return `${kpi.value.toFixed(1)}d`;
      default:
        return kpi.value.toFixed(1);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/0 border-amber-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4 text-amber-500 fill-amber-500" />
          <CardTitle className="text-base">Pinned KPIs</CardTitle>
          <Badge variant="outline" className="ml-auto text-xs">
            {pinnedKPIs.length} pinned
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pinnedKPIs.map((kpi) => (
            <div
              key={kpi.id}
              className="group relative p-3 bg-card/50 rounded-lg border border-border/50 hover:border-amber-500/30 transition-colors cursor-pointer"
              onClick={() => onKPIClick(kpi)}
            >
              {/* Unpin button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnpin(kpi.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>

              {/* KPI Content */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2 pr-6">
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {kpi.displayName}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={cn("text-[10px] px-1 py-0", statusColors[kpi.status])}
                  >
                    {kpi.status}
                  </Badge>
                </div>

                <div className="flex items-end justify-between">
                  <span className="text-lg font-bold">{formatValue(kpi)}</span>
                  {kpi.trendDirection && kpi.trendDirection !== 'stable' && (
                    <div className={cn(
                      "flex items-center gap-0.5 text-xs",
                      kpi.trendDirection === 'up' 
                        ? kpi.lowerIsBetter ? 'text-rose-500' : 'text-emerald-500'
                        : kpi.lowerIsBetter ? 'text-emerald-500' : 'text-rose-500'
                    )}>
                      {kpi.trendDirection === 'up' ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{kpi.trendPercentage?.toFixed(0)}%</span>
                    </div>
                  )}
                </div>

                {/* Mini sparkline */}
                <div className="h-8">
                  <KPISparkline kpi={kpi} height={32} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
