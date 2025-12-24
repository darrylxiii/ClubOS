import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, TrendingUp, Target, Euro, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMultiHirePipelineMetrics, formatCurrencyCompact, formatCurrencyFull } from '@/hooks/useMultiHirePipelineMetrics';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MultiHirePipelineCardProps {
  className?: string;
  compact?: boolean;
}

export function MultiHirePipelineCard({ className, compact = false }: MultiHirePipelineCardProps) {
  const { data: metrics, isLoading } = useMultiHirePipelineMetrics();

  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics || metrics.multiHireRoleCount === 0) {
    return null;
  }

  const { 
    totalProjectedValue, 
    realizedValue, 
    remainingPipeline,
    weightedRemaining,
    totalHires, 
    totalTarget, 
    multiHireRoleCount,
    progressPercent 
  } = metrics;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 cursor-default",
                className
              )}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {totalHires}/{totalTarget}
                </span>
              </div>
              <div className="h-4 w-px bg-primary/20" />
              <div className="flex items-center gap-1.5">
                <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {formatCurrencyCompact(realizedValue)} / {formatCurrencyCompact(totalProjectedValue)}
                </span>
              </div>
              <Progress value={progressPercent} className="w-16 h-1.5" />
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1 text-xs">
              <p><strong>{multiHireRoleCount} multi-hire roles</strong></p>
              <p>Realized: {formatCurrencyFull(realizedValue)}</p>
              <p>Remaining: {formatCurrencyFull(remainingPipeline)}</p>
              <p>Weighted: {formatCurrencyFull(weightedRemaining)}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" />
          Multi-Hire Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {formatCurrencyCompact(totalProjectedValue)}
            </div>
            <div className="text-xs text-muted-foreground">Total Projected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrencyCompact(realizedValue)}
            </div>
            <div className="text-xs text-muted-foreground">Realized</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrencyCompact(remainingPipeline)}
            </div>
            <div className="text-xs text-muted-foreground">Remaining</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {totalHires} of {totalTarget} hires ({progressPercent}%)
            </span>
            <span className="text-muted-foreground">
              {multiHireRoleCount} role{multiHireRoleCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="relative h-3 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-primary rounded-full"
            />
          </div>
        </div>

        {/* Flow visualization */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Realized</span>
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">In Progress</span>
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
            <span className="text-muted-foreground">Target</span>
          </div>
        </div>

        {/* Weighted value note */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
                <TrendingUp className="h-3 w-3" />
                <span>Weighted remaining: {formatCurrencyCompact(weightedRemaining)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs max-w-[200px]">
                Weighted value accounts for stage probability. 
                Higher stage = higher probability of closing.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
