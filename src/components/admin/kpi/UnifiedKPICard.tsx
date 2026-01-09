import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnifiedKPI } from '@/hooks/useUnifiedKPIs';
import { KPISparkline } from './KPISparkline';

interface UnifiedKPICardProps {
  kpi: UnifiedKPI;
  showCategory?: boolean;
  showSparkline?: boolean;
}

const statusConfig = {
  success: {
    badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    icon: CheckCircle,
    border: 'border-emerald-500/30',
  },
  warning: {
    badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    icon: AlertTriangle,
    border: 'border-amber-500/30',
  },
  critical: {
    badge: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    icon: XCircle,
    border: 'border-rose-500/30',
  },
  neutral: {
    badge: 'bg-muted text-muted-foreground border-border',
    icon: Minus,
    border: 'border-border/50',
  },
};

const actionTips: Record<string, string> = {
  cpl: 'Optimize campaigns per audience or keyword',
  landing_page_conversion_rate: 'A/B test pages with >70% bounce',
  show_rate: 'Implement reminder sequence 24h before',
  win_rate: 'Review loss reasons and improve proposal quality',
  slipping_deals: 'Follow up immediately on stale opportunities',
  bounce_rate: 'Analyze heatmaps for problem pages',
  ai_reply_rate: 'Test different subject lines and personalization',
  nps_candidate: 'Gather feedback and address common concerns',
  pipeline_win_rate: 'Focus on qualification criteria',
};

export function UnifiedKPICard({ kpi, showCategory = false, showSparkline = false }: UnifiedKPICardProps) {
  // Safe status lookup with fallback to neutral
  const safeStatus = kpi?.status && statusConfig[kpi.status] ? kpi.status : 'neutral';
  const config = statusConfig[safeStatus];
  const StatusIcon = config.icon;

  const formatValue = (value: number | undefined | null) => {
    const safeValue = typeof value === 'number' && isFinite(value) ? value : 0;
    switch (kpi?.format) {
      case 'percent':
        return `${safeValue.toFixed(1)}%`;
      case 'currency':
        return new Intl.NumberFormat('nl-NL', { 
          style: 'currency', 
          currency: 'EUR',
          maximumFractionDigits: 0 
        }).format(safeValue);
      case 'hours':
        return `${safeValue.toFixed(1)}h`;
      case 'days':
        return `${safeValue.toFixed(1)}d`;
      case 'minutes':
        return `${safeValue.toFixed(0)}min`;
      case 'ms':
        return `${safeValue.toFixed(0)}ms`;
      default:
        return safeValue.toLocaleString('nl-NL', { maximumFractionDigits: 1 });
    }
  };

  // Guard against null/undefined kpi
  if (!kpi) return null;

  const progress = kpi.targetValue
    ? kpi.lowerIsBetter
      ? Math.max(0, Math.min(100, ((kpi.targetValue - kpi.value) / kpi.targetValue) * 100 + 100))
      : Math.min(100, (kpi.value / kpi.targetValue) * 100)
    : 0;

  const actionTip = actionTips[kpi.name];

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all hover:shadow-md hover:scale-[1.01]",
      config.border
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            {showCategory && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {kpi.category}
              </Badge>
            )}
            <CardTitle className="text-sm font-medium text-muted-foreground leading-tight">
              {kpi.displayName}
            </CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={cn("gap-1 text-xs", config.badge)}
          >
            <StatusIcon className="h-3 w-3" />
            <span className="capitalize">{kpi.status}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Value and Trend */}
        <div className="flex items-end justify-between">
          <div className="text-2xl font-bold tracking-tight">
            {formatValue(kpi.value)}
          </div>
          {kpi.trendDirection && kpi.trendDirection !== 'stable' && (
            <div className={cn(
              "flex items-center gap-1 text-sm",
              kpi.trendDirection === 'up' 
                ? kpi.lowerIsBetter ? 'text-rose-500' : 'text-emerald-500'
                : kpi.lowerIsBetter ? 'text-emerald-500' : 'text-rose-500'
            )}>
              {kpi.trendDirection === 'up' ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{kpi.trendPercentage?.toFixed(1)}%</span>
            </div>
          )}
          {kpi.trendDirection === 'stable' && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Minus className="h-4 w-4" />
              <span>Stable</span>
            </div>
          )}
        </div>

        {/* Target Progress */}
        {kpi.targetValue !== undefined && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Target: {formatValue(kpi.targetValue)}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress 
              value={progress} 
              className="h-1.5"
            />
          </div>
        )}

        {/* Sparkline */}
        {showSparkline && (
          <div className="h-10 mt-1">
            <KPISparkline kpi={kpi} height={40} />
          </div>
        )}

        {/* Breakdown */}
        {kpi.breakdown && Object.keys(kpi.breakdown).length > 0 && (
          <div className="pt-2 border-t border-border/50 space-y-1">
            {Object.entries(kpi.breakdown).slice(0, 3).map(([key, val]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-muted-foreground capitalize">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="font-medium">{val as number}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Tip */}
        {actionTip && kpi.status !== 'success' && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-start gap-2 text-xs">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{actionTip}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
