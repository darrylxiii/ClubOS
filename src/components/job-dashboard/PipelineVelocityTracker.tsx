import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Zap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PipelineVelocityTrackerProps {
  stages: { name: string; order: number }[];
  avgDaysInStage: { [key: number]: number };
  stageBreakdown: { [key: number]: number };
}

interface StageVelocity {
  name: string;
  order: number;
  avgDays: number;
  candidateCount: number;
  velocity: 'fast' | 'normal' | 'slow';
  benchmark: number;
  trend: 'improving' | 'stable' | 'declining';
}

export const PipelineVelocityTracker = memo(({
  stages,
  avgDaysInStage,
  stageBreakdown
}: PipelineVelocityTrackerProps) => {
  const velocityData = useMemo((): StageVelocity[] => {
    const benchmarks: { [key: string]: number } = {
      'Applied': 2,
      'Screening': 3,
      'Interview': 5,
      'Technical': 4,
      'Culture': 3,
      'Offer': 2,
      'default': 4
    };

    return stages.map(stage => {
      const avgDays = avgDaysInStage[stage.order] || 0;
      const benchmark = benchmarks[stage.name] || benchmarks.default;
      const candidateCount = stageBreakdown[stage.order] || 0;
      
      let velocity: 'fast' | 'normal' | 'slow' = 'normal';
      if (avgDays <= benchmark * 0.7) velocity = 'fast';
      else if (avgDays >= benchmark * 1.5) velocity = 'slow';
      
      // Simulated trend - in production would compare to historical data
      const trend: 'improving' | 'stable' | 'declining' = 
        avgDays < benchmark ? 'improving' : avgDays > benchmark * 1.3 ? 'declining' : 'stable';

      return {
        name: stage.name,
        order: stage.order,
        avgDays,
        candidateCount,
        velocity,
        benchmark,
        trend
      };
    });
  }, [stages, avgDaysInStage, stageBreakdown]);

  const totalPipelineTime = velocityData.reduce((sum, s) => sum + s.avgDays, 0);
  const avgBenchmark = velocityData.reduce((sum, s) => sum + s.benchmark, 0);
  const overallHealth = totalPipelineTime <= avgBenchmark ? 'healthy' : totalPipelineTime <= avgBenchmark * 1.3 ? 'moderate' : 'slow';

  const getVelocityColor = (velocity: 'fast' | 'normal' | 'slow') => {
    switch (velocity) {
      case 'fast': return 'bg-success/20 text-success border-success/30';
      case 'normal': return 'bg-primary/20 text-primary border-primary/30';
      case 'slow': return 'bg-destructive/20 text-destructive border-destructive/30';
    }
  };

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-3 h-3 text-success" />;
      case 'stable': return <Minus className="w-3 h-3 text-muted-foreground" />;
      case 'declining': return <TrendingDown className="w-3 h-3 text-destructive" />;
    }
  };

  const getHealthBadge = () => {
    switch (overallHealth) {
      case 'healthy': return <Badge className="bg-success/10 text-success border-success/20 text-xs">Healthy</Badge>;
      case 'moderate': return <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">Moderate</Badge>;
      case 'slow': return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Slow</Badge>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl border border-border/50 shadow-[var(--shadow-glass-lg)] overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div 
                className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Zap className="w-4 h-4 text-primary" />
              </motion.div>
              <div>
                <CardTitle className="text-base font-bold">Pipeline Velocity</CardTitle>
                <p className="text-xs text-muted-foreground">Avg {totalPipelineTime}d total • Target {avgBenchmark}d</p>
              </div>
            </div>
            {getHealthBadge()}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <TooltipProvider>
            {/* Timeline Visualization */}
            <div className="relative">
              {/* Connection Line */}
              <div className="absolute top-6 left-4 right-4 h-0.5 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30" />
              
              {/* Stage Nodes */}
              <div className="relative flex justify-between gap-1">
                {velocityData.map((stage, index) => (
                  <Tooltip key={stage.order}>
                    <TooltipTrigger asChild>
                      <motion.div
                        className="flex flex-col items-center flex-1"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        {/* Node */}
                        <motion.div
                          className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                            stage.velocity === 'fast' 
                              ? 'bg-success/20 border-success' 
                              : stage.velocity === 'slow' 
                              ? 'bg-destructive/20 border-destructive' 
                              : 'bg-primary/20 border-primary'
                          }`}
                          whileHover={{ scale: 1.15 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <span className="text-xs font-bold">{stage.candidateCount}</span>
                          
                          {/* Pulse for slow stages */}
                          {stage.velocity === 'slow' && (
                            <motion.div
                              className="absolute inset-0 rounded-full border-2 border-destructive"
                              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          )}
                        </motion.div>
                        
                        {/* Stage Name */}
                        <span className="text-[10px] font-medium mt-2 text-center truncate w-full">
                          {stage.name}
                        </span>
                        
                        {/* Days Badge */}
                        <div className="flex items-center gap-0.5 mt-1">
                          <Badge 
                            variant="outline" 
                            className={`text-[9px] px-1 py-0 h-4 ${getVelocityColor(stage.velocity)}`}
                          >
                            {stage.avgDays}d
                          </Badge>
                          {getTrendIcon(stage.trend)}
                        </div>
                        
                        {/* Arrow to next */}
                        {index < velocityData.length - 1 && (
                          <motion.div 
                            className="absolute top-3 -right-2 z-20"
                            animate={{ x: [0, 3, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                          </motion.div>
                        )}
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <div className="space-y-1">
                        <p className="font-semibold">{stage.name}</p>
                        <p>{stage.candidateCount} candidates • {stage.avgDays}d avg</p>
                        <p className="text-muted-foreground">Benchmark: {stage.benchmark}d</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Mini Sparkline Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/30">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-[10px] text-muted-foreground">Fast</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] text-muted-foreground">Normal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-[10px] text-muted-foreground">Slow</span>
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </motion.div>
  );
});

PipelineVelocityTracker.displayName = 'PipelineVelocityTracker';
