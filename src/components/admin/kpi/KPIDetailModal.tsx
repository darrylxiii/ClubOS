import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Bell,
  Pin,
  ExternalLink,
  Lightbulb,
  Brain,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnifiedKPI } from '@/hooks/useUnifiedKPIs';
import { KPISparkline } from './KPISparkline';
import { KPIForecastPanel } from './KPIForecastPanel';

interface KPIDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi: UnifiedKPI | null;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onConfigureAlert?: () => void;
}

const statusConfig = {
  success: {
    badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    icon: CheckCircle,
    label: 'On Target',
    bg: 'bg-emerald-500/5',
  },
  warning: {
    badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    icon: AlertTriangle,
    label: 'Warning',
    bg: 'bg-amber-500/5',
  },
  critical: {
    badge: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    icon: XCircle,
    label: 'Critical',
    bg: 'bg-rose-500/5',
  },
  neutral: {
    badge: 'bg-muted text-muted-foreground border-border',
    icon: Minus,
    label: 'Neutral',
    bg: 'bg-muted/30',
  },
};

const actionTips: Record<string, { tip: string; action?: string }> = {
  cpl: { tip: 'Optimize campaigns per audience or keyword', action: 'Review Ad Campaigns' },
  landing_page_conversion_rate: { tip: 'A/B test pages with >70% bounce', action: 'View Landing Pages' },
  show_rate: { tip: 'Implement reminder sequence 24h before', action: 'Configure Reminders' },
  win_rate: { tip: 'Review loss reasons and improve proposal quality', action: 'View Lost Deals' },
  slipping_deals: { tip: 'Follow up immediately on stale opportunities', action: 'View Stale Deals' },
  bounce_rate: { tip: 'Analyze heatmaps for problem pages', action: 'View Analytics' },
  ai_reply_rate: { tip: 'Test different subject lines and personalization', action: 'A/B Test Templates' },
  nps_candidate: { tip: 'Gather feedback and address common concerns', action: 'View Feedback' },
};

export function KPIDetailModal({
  open,
  onOpenChange,
  kpi,
  isPinned = false,
  onTogglePin,
  onConfigureAlert,
}: KPIDetailModalProps) {
  if (!kpi) return null;

  // Safe status lookup with fallback to neutral
  const safeStatus = kpi.status && statusConfig[kpi.status] ? kpi.status : 'neutral';
  const config = statusConfig[safeStatus];
  const StatusIcon = config.icon;
  const tip = actionTips[kpi.name || ''];

  const formatValue = (value: number | undefined | null) => {
    const safeValue = typeof value === 'number' && isFinite(value) ? value : 0;
    switch (kpi.format) {
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

  const progress = kpi.targetValue
    ? kpi.lowerIsBetter
      ? Math.max(0, Math.min(100, ((kpi.targetValue - kpi.value) / kpi.targetValue) * 100 + 100))
      : Math.min(100, (kpi.value / kpi.targetValue) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <Badge variant="outline" className="text-[10px] mb-1">
                {kpi.domain} / {kpi.category}
              </Badge>
              <DialogTitle className="text-xl">{kpi.displayName}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onTogglePin}
                className={cn(isPinned && "text-amber-500")}
              >
                <Pin className={cn("h-4 w-4", isPinned && "fill-current")} />
              </Button>
              <Button variant="ghost" size="icon" onClick={onConfigureAlert}>
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="forecast" className="gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              AI Forecast
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* Status Banner */}
            <div className={cn("p-4 rounded-lg", config.bg)}>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={cn("gap-1", config.badge)}>
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
                {kpi.trendDirection && (
                  <div className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    kpi.trendDirection === 'up' 
                      ? kpi.lowerIsBetter ? 'text-rose-500' : 'text-emerald-500'
                      : kpi.trendDirection === 'down'
                      ? kpi.lowerIsBetter ? 'text-emerald-500' : 'text-rose-500'
                      : 'text-muted-foreground'
                  )}>
                    {kpi.trendDirection === 'up' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : kpi.trendDirection === 'down' ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                    <span>{kpi.trendPercentage?.toFixed(1) || 0}% vs last period</span>
                  </div>
                )}
              </div>
            </div>

            {/* Main Value */}
            <div className="text-center">
              <div className="text-5xl font-bold tracking-tight">
                {formatValue(kpi.value)}
              </div>
              {kpi.targetValue && (
                <div className="mt-2 text-muted-foreground">
                  Target: {formatValue(kpi.targetValue)}
                </div>
              )}
            </div>

            {/* Progress */}
            {kpi.targetValue && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress to Target</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Sparkline Trend */}
            <div className="space-y-2">
              <span className="text-sm font-medium">7-Day Trend</span>
              <div className="h-16 bg-muted/30 rounded-lg p-2">
                <KPISparkline kpi={kpi} height={48} />
              </div>
            </div>

            {/* Breakdown */}
            {kpi.breakdown && Object.keys(kpi.breakdown).length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Breakdown</span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(kpi.breakdown).map(([key, val]) => (
                    <div 
                      key={key} 
                      className="flex justify-between p-2 bg-muted/30 rounded-lg text-sm"
                    >
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="font-medium">{val as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Tip */}
            {tip && kpi.status !== 'success' && (
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Recommended Action</p>
                    <p className="text-sm text-muted-foreground mt-1">{tip.tip}</p>
                    {tip.action && (
                      <Button variant="link" className="p-0 h-auto mt-2 text-amber-600">
                        {tip.action}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="forecast" className="mt-0">
            <KPIForecastPanel kpi={kpi} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
