import { motion } from 'framer-motion';
import { 
  TrendingUp, Calendar, Target, Gauge, Zap, Clock, BarChart3 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { usePipelineForecast } from '@/hooks/usePipelineForecast';
import { format, parseISO } from 'date-fns';

interface PipelineForecastProps {
  className?: string;
  year?: number;
}

const confidenceConfig = {
  high: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/30', label: 'High' },
  medium: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', label: 'Medium' },
  low: { color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border', label: 'Low' },
};

export function PipelineForecast({ className, year }: PipelineForecastProps) {
  const { data, isLoading } = usePipelineForecast(year);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `€${(amount / 1000).toFixed(0)}K`;
    return `€${Math.round(amount)}`;
  };

  if (isLoading) {
    return (
      <Card variant="elevated" className={cn('p-6 space-y-6', className)}>
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40" />
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Pipeline Overview */}
      <Card variant="elevated" className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-heading-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Pipeline Forecast
            </h3>
            <p className="text-label-sm text-muted-foreground">
              Projected milestone unlocks based on active deals
            </p>
          </div>
          <Badge variant="outline">{data.dealCount} active deals</Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-primary/10 border border-primary/30 space-y-1"
          >
            <div className="flex items-center gap-2 text-label-sm text-primary">
              <Target className="h-4 w-4" />
              Weighted Pipeline
            </div>
            <p className="text-heading-md font-bold">{formatCurrency(data.weightedPipeline)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-xl bg-muted/50 border border-border/30 space-y-1"
          >
            <div className="flex items-center gap-2 text-label-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Total Pipeline
            </div>
            <p className="text-heading-md font-bold">{formatCurrency(data.totalPipeline)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-muted/50 border border-border/30 space-y-1"
          >
            <div className="flex items-center gap-2 text-label-sm text-muted-foreground">
              <Gauge className="h-4 w-4" />
              Avg Probability
            </div>
            <p className="text-heading-md font-bold">{data.avgProbability.toFixed(0)}%</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-4 rounded-xl bg-success/10 border border-success/30 space-y-1"
          >
            <div className="flex items-center gap-2 text-label-sm text-success">
              <Zap className="h-4 w-4" />
              Monthly Velocity
            </div>
            <p className="text-heading-md font-bold">{formatCurrency(data.velocityMetrics.monthlyVelocity)}</p>
          </motion.div>
        </div>
      </Card>

      {/* Projected Milestones */}
      {data.projectedMilestones.length > 0 && (
        <Card variant="elevated" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-heading-sm font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-premium" />
              Projected Unlocks
            </h3>
          </div>

          <div className="space-y-3">
            {data.projectedMilestones.map((milestone, index) => {
              const config = confidenceConfig[milestone.confidence];
              
              return (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'p-4 rounded-xl border space-y-3',
                    config.bg,
                    config.border
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-label-md font-medium">{milestone.displayName}</p>
                      <p className="text-label-sm text-muted-foreground">
                        {formatCurrency(milestone.remaining)} remaining to {formatCurrency(milestone.threshold)}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant="outline" className={cn(config.color, config.bg)}>
                        {config.label} confidence
                      </Badge>
                      {milestone.projectedUnlockDate && (
                        <p className="text-label-sm text-muted-foreground flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(milestone.projectedUnlockDate), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-label-xs text-muted-foreground">
                      <span>Pipeline Coverage</span>
                      <span>{milestone.pipelineCoverage.toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={milestone.pipelineCoverage} 
                      className="h-2"
                    />
                  </div>

                  {milestone.pipelineCoverage >= 100 && (
                    <div className="flex items-center gap-2 text-success text-label-sm">
                      <Zap className="h-4 w-4" />
                      Pipeline covers this milestone!
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Velocity Insights */}
      <Card variant="elevated" className="p-6">
        <div className="flex flex-wrap items-center justify-center gap-6 text-center">
          <div className="space-y-1">
            <p className="text-label-sm text-muted-foreground">Avg Days Between Placements</p>
            <p className="text-heading-sm font-bold">
              {data.velocityMetrics.avgDaysToClose > 0 
                ? `${Math.round(data.velocityMetrics.avgDaysToClose)} days` 
                : 'N/A'}
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="space-y-1">
            <p className="text-label-sm text-muted-foreground">Avg Placement Fee</p>
            <p className="text-heading-sm font-bold">{formatCurrency(data.velocityMetrics.avgPlacementFee)}</p>
          </div>
          <div className="h-8 w-px bg-border hidden md:block" />
          <div className="space-y-1">
            <p className="text-label-sm text-muted-foreground">Avg Deal Value</p>
            <p className="text-heading-sm font-bold">{formatCurrency(data.avgDealValue)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
