import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Eye,
  Clock,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { UnifiedKPI } from '@/hooks/useUnifiedKPIs';

interface AnomalyDetectionPanelProps {
  allKPIs: UnifiedKPI[];
  onKPIClick?: (kpi: UnifiedKPI) => void;
  className?: string;
}

interface Anomaly {
  kpi: UnifiedKPI;
  type: 'spike' | 'drop' | 'pattern_break' | 'threshold_breach';
  severity: 'high' | 'medium' | 'low';
  deviation: number;
  description: string;
  suggestedAction: string;
  detectedAt: Date;
}

// Detect anomalies using statistical methods
function detectAnomalies(kpis: UnifiedKPI[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  kpis.forEach(kpi => {
    const value = kpi.value;
    const previousValue = kpi.previousValue || value;
    const target = kpi.targetValue;
    const trendPct = kpi.trendPercentage || 0;
    
    // Skip KPIs with no meaningful data
    if (value === 0 && previousValue === 0) return;
    
    // Calculate percent change
    const percentChange = previousValue !== 0 
      ? ((value - previousValue) / previousValue) * 100 
      : 0;
    
    // 1. Detect significant spikes (>30% increase)
    if (percentChange > 30 && !kpi.lowerIsBetter) {
      anomalies.push({
        kpi,
        type: 'spike',
        severity: percentChange > 50 ? 'high' : 'medium',
        deviation: percentChange,
        description: `${kpi.displayName} spiked ${percentChange.toFixed(1)}% above normal`,
        suggestedAction: 'Investigate cause and determine if sustainable',
        detectedAt: new Date(),
      });
    }
    
    // 2. Detect significant drops (>25% decrease)
    if (percentChange < -25 && !kpi.lowerIsBetter) {
      anomalies.push({
        kpi,
        type: 'drop',
        severity: percentChange < -40 ? 'high' : 'medium',
        deviation: Math.abs(percentChange),
        description: `${kpi.displayName} dropped ${Math.abs(percentChange).toFixed(1)}% below normal`,
        suggestedAction: 'Immediate review required to identify blockers',
        detectedAt: new Date(),
      });
    }
    
    // 3. Threshold breach detection
    if (kpi.status === 'critical' && target) {
      const breachPct = kpi.lowerIsBetter 
        ? ((value - target) / target) * 100
        : ((target - value) / target) * 100;
      
      if (breachPct > 20) {
        anomalies.push({
          kpi,
          type: 'threshold_breach',
          severity: 'high',
          deviation: breachPct,
          description: `${kpi.displayName} is ${breachPct.toFixed(1)}% ${kpi.lowerIsBetter ? 'above' : 'below'} target`,
          suggestedAction: 'Escalate and implement corrective action',
          detectedAt: new Date(),
        });
      }
    }
    
    // 4. Pattern break detection (trend reversal)
    if (kpi.trendDirection && Math.abs(trendPct) > 15) {
      const isReversal = (kpi.trendDirection === 'up' && kpi.lowerIsBetter) ||
                         (kpi.trendDirection === 'down' && !kpi.lowerIsBetter);
      
      if (isReversal && kpi.status !== 'success') {
        anomalies.push({
          kpi,
          type: 'pattern_break',
          severity: 'medium',
          deviation: Math.abs(trendPct),
          description: `${kpi.displayName} shows trend reversal (${Math.abs(trendPct).toFixed(1)}% ${kpi.trendDirection})`,
          suggestedAction: 'Monitor closely for continued pattern',
          detectedAt: new Date(),
        });
      }
    }
  });
  
  // Sort by severity and deviation
  return anomalies.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return b.deviation - a.deviation;
  }).slice(0, 5); // Top 5 anomalies
}

const anomalyConfig = {
  spike: {
    icon: TrendingUp,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  drop: {
    icon: TrendingDown,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
  pattern_break: {
    icon: Zap,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  threshold_breach: {
    icon: AlertTriangle,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
};

const severityConfig = {
  high: { label: 'High', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  medium: { label: 'Medium', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  low: { label: 'Low', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
};

export function AnomalyDetectionPanel({ allKPIs, onKPIClick, className }: AnomalyDetectionPanelProps) {
  const anomalies = useMemo(() => detectAnomalies(allKPIs), [allKPIs]);
  
  if (anomalies.length === 0) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Anomaly Detection
            </CardTitle>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              All Clear
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium">No Anomalies Detected</p>
            <p className="text-xs text-muted-foreground mt-1">
              All KPIs are within expected ranges
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Anomaly Detection
          </CardTitle>
          <Badge variant="outline" className={cn(
            "text-[10px]",
            anomalies.some(a => a.severity === 'high') 
              ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
          )}>
            {anomalies.length} Detected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {anomalies.map((anomaly, index) => {
          const config = anomalyConfig[anomaly.type];
          const Icon = config.icon;
          const severity = severityConfig[anomaly.severity];
          
          return (
            <div 
              key={`${anomaly.kpi.id}-${index}`}
              className={cn(
                "p-3 rounded-lg border transition-colors cursor-pointer",
                config.bg,
                config.border,
                "hover:opacity-80"
              )}
              onClick={() => onKPIClick?.(anomaly.kpi)}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                  config.bg
                )}>
                  <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">
                      {anomaly.kpi.displayName}
                    </span>
                    <Badge variant="outline" className={cn("text-[10px]", severity.color)}>
                      {severity.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {anomaly.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(anomaly.detectedAt, { addSuffix: true })}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs px-2 ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        onKPIClick?.(anomaly.kpi);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Investigate
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
