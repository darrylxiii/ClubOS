import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface QuickResponseTimeTrackerProps {
  avgDaysInStage: { [key: number]: number };
  stages: { name: string; order: number }[];
}

interface StageMetric {
  name: string;
  order: number;
  avgDays: number;
  benchmark: number;
  status: 'fast' | 'normal' | 'slow';
  percentOfBenchmark: number;
}

// Industry benchmarks for hiring stages (in days)
const STAGE_BENCHMARKS: { [key: string]: number } = {
  applied: 2,
  screening: 3,
  screen: 3,
  interview: 5,
  technical: 4,
  final: 3,
  offer: 2,
  default: 4
};

export const QuickResponseTimeTracker = memo(({
  avgDaysInStage,
  stages
}: QuickResponseTimeTrackerProps) => {
  
  const stageMetrics = useMemo(() => {
    return stages.map(stage => {
      const avgDays = avgDaysInStage[stage.order] || 0;
      const stageLower = stage.name.toLowerCase();
      
      // Find matching benchmark
      let benchmark = STAGE_BENCHMARKS.default;
      for (const [key, value] of Object.entries(STAGE_BENCHMARKS)) {
        if (stageLower.includes(key)) {
          benchmark = value;
          break;
        }
      }
      
      const percentOfBenchmark = benchmark > 0 ? (avgDays / benchmark) * 100 : 0;
      
      let status: 'fast' | 'normal' | 'slow' = 'normal';
      if (avgDays === 0 || percentOfBenchmark < 80) {
        status = 'fast';
      } else if (percentOfBenchmark > 150) {
        status = 'slow';
      }
      
      return {
        name: stage.name,
        order: stage.order,
        avgDays,
        benchmark,
        status,
        percentOfBenchmark: Math.min(percentOfBenchmark, 200)
      };
    });
  }, [avgDaysInStage, stages]);

  const overallAvg = useMemo(() => {
    const values = Object.values(avgDaysInStage).filter(v => v > 0);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }, [avgDaysInStage]);

  const totalDays = useMemo(() => {
    return Object.values(avgDaysInStage).reduce((a, b) => a + b, 0);
  }, [avgDaysInStage]);

  const slowStages = stageMetrics.filter(s => s.status === 'slow');

  const getStatusColor = (status: 'fast' | 'normal' | 'slow') => {
    switch (status) {
      case 'fast':
        return 'text-success';
      case 'slow':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status: 'fast' | 'normal' | 'slow') => {
    switch (status) {
      case 'fast':
        return 'bg-success/20';
      case 'slow':
        return 'bg-destructive/20';
      default:
        return 'bg-muted';
    }
  };

  const getProgressColor = (status: 'fast' | 'normal' | 'slow') => {
    switch (status) {
      case 'fast':
        return '[&>div]:bg-success';
      case 'slow':
        return '[&>div]:bg-destructive';
      default:
        return '[&>div]:bg-primary';
    }
  };

  const getStatusIcon = (status: 'fast' | 'normal' | 'slow') => {
    switch (status) {
      case 'fast':
        return <TrendingUp className="w-3 h-3" />;
      case 'slow':
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  return (
    <Card className="border-2 border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl shadow-[var(--shadow-glass-md)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base font-bold">Response Times</CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs ${slowStages.length > 0 ? 'border-destructive/30 text-destructive' : 'border-success/30 text-success'}`}
          >
            <Zap className="w-3 h-3 mr-1" />
            {totalDays}d avg total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Summary Row */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <span className="text-xs text-muted-foreground">Per-stage average</span>
          <span className="text-sm font-semibold">{overallAvg} days</span>
        </div>
        
        {/* Stage Breakdown */}
        <div className="space-y-2">
          {stageMetrics.slice(0, 4).map((metric) => (
            <div key={metric.order} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium truncate max-w-[120px]">
                  {metric.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold ${getStatusColor(metric.status)}`}>
                    {metric.avgDays}d
                  </span>
                  <span className={`p-0.5 rounded ${getStatusBg(metric.status)} ${getStatusColor(metric.status)}`}>
                    {getStatusIcon(metric.status)}
                  </span>
                </div>
              </div>
              <Progress 
                value={Math.min(metric.percentOfBenchmark, 100)} 
                className={`h-1.5 ${getProgressColor(metric.status)}`}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Benchmark: {metric.benchmark}d
                </span>
                <span className={`text-[10px] ${getStatusColor(metric.status)}`}>
                  {metric.status === 'fast' && 'Ahead'}
                  {metric.status === 'normal' && 'On track'}
                  {metric.status === 'slow' && 'Behind'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottleneck Alert */}
        {slowStages.length > 0 && (
          <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="text-xs text-destructive font-medium">
              ⚠️ Bottleneck: {slowStages.map(s => s.name).join(', ')}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {slowStages.length === 1 
                ? `${slowStages[0].avgDays}d avg vs ${slowStages[0].benchmark}d benchmark`
                : `${slowStages.length} stages running behind`
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

QuickResponseTimeTracker.displayName = 'QuickResponseTimeTracker';
