import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, Clock, Users, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface JobPerformanceScorecardProps {
  metrics: {
    totalApplicants: number;
    stageBreakdown: { [key: number]: number };
    avgDaysInStage: { [key: number]: number };
    conversionRates: { [key: string]: number };
  };
  daysOpen: number;
}

interface PerformanceMetric {
  label: string;
  value: number;
  benchmark: number;
  unit: string;
  icon: React.ElementType;
  trend: 'up' | 'down' | 'neutral';
  description: string;
}

export const JobPerformanceScorecard = memo(({ metrics, daysOpen }: JobPerformanceScorecardProps) => {
  const performanceData = useMemo((): PerformanceMetric[] => {
    const totalDays = Object.values(metrics.avgDaysInStage).reduce((a, b) => a + b, 0);
    const avgConversion = Object.values(metrics.conversionRates).length > 0
      ? Object.values(metrics.conversionRates).reduce((a, b) => a + b, 0) / Object.values(metrics.conversionRates).length
      : 0;

    return [
      {
        label: 'Time to Fill',
        value: totalDays,
        benchmark: 21,
        unit: 'days',
        icon: Clock,
        trend: totalDays <= 21 ? 'up' : totalDays <= 30 ? 'neutral' : 'down',
        description: 'Average time from posting to hire'
      },
      {
        label: 'Applicant Volume',
        value: metrics.totalApplicants,
        benchmark: 25,
        unit: 'candidates',
        icon: Users,
        trend: metrics.totalApplicants >= 25 ? 'up' : metrics.totalApplicants >= 15 ? 'neutral' : 'down',
        description: 'Total applications received'
      },
      {
        label: 'Conversion Rate',
        value: Math.round(avgConversion),
        benchmark: 30,
        unit: '%',
        icon: TrendingUp,
        trend: avgConversion >= 30 ? 'up' : avgConversion >= 20 ? 'neutral' : 'down',
        description: 'Average stage-to-stage conversion'
      },
      {
        label: 'Days Open',
        value: daysOpen,
        benchmark: 30,
        unit: 'days',
        icon: Target,
        trend: daysOpen <= 30 ? 'up' : daysOpen <= 45 ? 'neutral' : 'down',
        description: 'Time since job was posted'
      }
    ];
  }, [metrics, daysOpen]);

  const overallScore = useMemo(() => {
    const scores = performanceData.map(m => {
      const ratio = m.value / m.benchmark;
      // For time-based metrics, lower is better
      if (m.label.includes('Time') || m.label.includes('Days')) {
        return Math.min(100, Math.round((1 / Math.max(ratio, 0.1)) * 100));
      }
      return Math.min(100, Math.round(ratio * 100));
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [performanceData]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-primary';
    if (score >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const getProgressColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return 'bg-success';
      case 'neutral': return 'bg-primary';
      case 'down': return 'bg-destructive';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <Card className="bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl border border-border/50 shadow-[var(--shadow-glass-lg)] overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div 
                className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20"
                whileHover={{ scale: 1.05, rotate: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <BarChart3 className="w-4 h-4 text-primary" />
              </motion.div>
              <div>
                <CardTitle className="text-base font-bold">Performance Scorecard</CardTitle>
                <p className="text-xs text-muted-foreground">vs. company benchmarks</p>
              </div>
            </div>
            
            {/* Overall Score Gauge */}
            <motion.div
              className="relative"
              whileHover={{ scale: 1.1 }}
            >
              <svg className="w-14 h-14 -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-muted/20"
                />
                <motion.circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${overallScore * 1.5} 150`}
                  className={getScoreColor(overallScore)}
                  initial={{ strokeDasharray: '0 150' }}
                  animate={{ strokeDasharray: `${overallScore * 1.5} 150` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold ${getScoreColor(overallScore)}`}>
                  {overallScore}
                </span>
              </div>
            </motion.div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <TooltipProvider>
            <div className="grid grid-cols-2 gap-3">
              {performanceData.map((metric, index) => (
                <Tooltip key={metric.label}>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      className="p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-all border border-transparent hover:border-border/30 cursor-default"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <metric.icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">{metric.label}</span>
                        </div>
                        {metric.trend === 'up' ? (
                          <TrendingUp className="w-3.5 h-3.5 text-success" />
                        ) : metric.trend === 'down' ? (
                          <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                        ) : null}
                      </div>
                      
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold">{metric.value}</span>
                        <span className="text-xs text-muted-foreground">{metric.unit}</span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${getProgressColor(metric.trend)}`}
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${Math.min(100, (metric.value / metric.benchmark) * 100)}%` 
                          }}
                          transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                        />
                      </div>
                      
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        Benchmark: {metric.benchmark} {metric.unit}
                      </p>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                    <p>{metric.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </motion.div>
  );
});

JobPerformanceScorecard.displayName = 'JobPerformanceScorecard';
