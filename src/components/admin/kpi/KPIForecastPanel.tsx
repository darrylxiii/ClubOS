import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Target, 
  Calendar,
  Brain,
  ArrowRight,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnifiedKPI } from '@/hooks/useUnifiedKPIs';

interface KPIForecastPanelProps {
  kpi: UnifiedKPI;
  className?: string;
}

interface ForecastPoint {
  days: number;
  label: string;
  predictedValue: number;
  confidenceLow: number;
  confidenceHigh: number;
  goalAttainmentProbability: number;
}

// Simple linear regression forecast
function generateForecast(kpi: UnifiedKPI): ForecastPoint[] {
  const currentValue = kpi.value;
  const previousValue = kpi.previousValue || currentValue;
  const targetValue = kpi.targetValue;
  
  // Calculate daily rate of change
  const weeklyChange = currentValue - previousValue;
  const dailyChange = weeklyChange / 7;
  
  // Add some variance for confidence intervals
  const volatility = Math.abs(dailyChange) * 0.3 + (currentValue * 0.02);
  
  const forecasts: ForecastPoint[] = [
    { days: 7, label: '7 days' },
    { days: 30, label: '30 days' },
    { days: 90, label: '90 days' },
  ].map(({ days, label }) => {
    const predictedValue = currentValue + (dailyChange * days);
    const confidenceWidth = volatility * Math.sqrt(days);
    
    // Calculate goal attainment probability
    let goalAttainmentProbability = 50;
    if (targetValue) {
      const distanceToGoal = kpi.lowerIsBetter 
        ? currentValue - targetValue 
        : targetValue - currentValue;
      const progressPerDay = kpi.lowerIsBetter ? -dailyChange : dailyChange;
      
      if (progressPerDay > 0 && distanceToGoal > 0) {
        const daysToGoal = distanceToGoal / progressPerDay;
        goalAttainmentProbability = daysToGoal <= days ? 85 : Math.max(15, 85 - (daysToGoal - days) * 2);
      } else if (distanceToGoal <= 0) {
        goalAttainmentProbability = 95;
      } else {
        goalAttainmentProbability = Math.max(5, 30 - days * 0.2);
      }
    }
    
    return {
      days,
      label,
      predictedValue: Math.max(0, predictedValue),
      confidenceLow: Math.max(0, predictedValue - confidenceWidth),
      confidenceHigh: predictedValue + confidenceWidth,
      goalAttainmentProbability: Math.min(99, Math.max(1, goalAttainmentProbability)),
    };
  });
  
  return forecasts;
}

// Generate trend explanation
function getTrendExplanation(kpi: UnifiedKPI, forecasts: ForecastPoint[]): string {
  const trend = kpi.trendDirection;
  const trendPct = kpi.trendPercentage || 0;
  const forecast30 = forecasts[1];
  
  const direction = trend === 'up' ? 'increasing' : trend === 'down' ? 'decreasing' : 'stable';
  const impact = kpi.lowerIsBetter 
    ? (trend === 'down' ? 'positive' : trend === 'up' ? 'concerning' : 'neutral')
    : (trend === 'up' ? 'positive' : trend === 'down' ? 'concerning' : 'neutral');
  
  if (forecast30.goalAttainmentProbability > 80) {
    return `Based on current ${direction} trend (${Math.abs(trendPct).toFixed(1)}% week-over-week), this KPI is likely to meet its target within the forecast period.`;
  } else if (forecast30.goalAttainmentProbability > 50) {
    return `The ${direction} trend suggests moderate chance of reaching target. Consider optimizing contributing factors.`;
  } else {
    return `Current trajectory indicates challenge reaching target. Recommend immediate intervention to improve performance.`;
  }
}

export function KPIForecastPanel({ kpi, className }: KPIForecastPanelProps) {
  const forecasts = generateForecast(kpi);
  const explanation = getTrendExplanation(kpi, forecasts);
  
  const formatValue = (value: number) => {
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
      default:
        return safeValue.toLocaleString('nl-NL', { maximumFractionDigits: 1 });
    }
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 75) return 'text-emerald-500';
    if (prob >= 50) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getProbabilityBg = (prob: number) => {
    if (prob >= 75) return 'bg-emerald-500/10';
    if (prob >= 50) return 'bg-amber-500/10';
    return 'bg-rose-500/10';
  };

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Forecast
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            Powered by QUIN
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current vs Predicted */}
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
          <div className="flex-1 text-center">
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="text-lg font-bold">{formatValue(kpi.value)}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 text-center">
            <p className="text-xs text-muted-foreground">30-day Forecast</p>
            <p className={cn(
              "text-lg font-bold",
              forecasts[1].predictedValue > kpi.value 
                ? kpi.lowerIsBetter ? 'text-rose-500' : 'text-emerald-500'
                : kpi.lowerIsBetter ? 'text-emerald-500' : 'text-rose-500'
            )}>
              {formatValue(forecasts[1].predictedValue)}
            </p>
          </div>
        </div>

        {/* Forecast Timeline */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Prediction Timeline
          </p>
          <div className="space-y-2">
            {forecasts.map((forecast) => (
              <TooltipProvider key={forecast.days}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-help">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{forecast.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {formatValue(forecast.predictedValue)}
                        </span>
                        {kpi.targetValue && (
                          <div className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                            getProbabilityBg(forecast.goalAttainmentProbability),
                            getProbabilityColor(forecast.goalAttainmentProbability)
                          )}>
                            <Target className="h-3 w-3" />
                            {forecast.goalAttainmentProbability}%
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <div className="space-y-1 text-xs">
                      <p><strong>Confidence Range:</strong></p>
                      <p>{formatValue(forecast.confidenceLow)} – {formatValue(forecast.confidenceHigh)}</p>
                      {kpi.targetValue && (
                        <p className="mt-2">
                          <strong>Goal Attainment:</strong> {forecast.goalAttainmentProbability}% likely to reach {formatValue(kpi.targetValue)}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        {/* Trend Explanation */}
        <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {explanation}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
