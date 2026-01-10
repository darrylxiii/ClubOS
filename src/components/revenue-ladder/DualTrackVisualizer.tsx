import { motion } from 'framer-motion';
import { TrendingUp, Trophy, Calendar, Infinity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RevenueLadder } from '@/hooks/useRevenueLadder';

interface DualTrackVisualizerProps {
  annualLadder?: RevenueLadder;
  cumulativeLadder?: RevenueLadder;
}

function TrackCard({ 
  ladder, 
  type 
}: { 
  ladder?: RevenueLadder; 
  type: 'annual' | 'cumulative';
}) {
  const config = type === 'annual' 
    ? {
        icon: Calendar,
        title: 'Annual Revenue',
        subtitle: 'Execution Focus',
        gradient: 'from-primary/20 via-primary/10 to-transparent',
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      }
    : {
        icon: Infinity,
        title: 'Lifetime Revenue',
        subtitle: 'Vision Focus',
        gradient: 'from-premium/20 via-premium/10 to-transparent',
        color: 'text-premium',
        bgColor: 'bg-premium/10',
      };

  const Icon = config.icon;
  const milestones = ladder?.revenue_milestones || [];
  const unlockedCount = milestones.filter(m => m.status === 'unlocked' || m.status === 'rewarded').length;
  const currentRevenue = milestones.reduce((max, m) => Math.max(max, m.achieved_revenue || 0), 0);
  const nextMilestone = milestones.find(m => m.status === 'locked' || m.status === 'approaching');
  
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `€${(amount / 1000).toFixed(0)}K`;
    }
    return `€${amount}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <Card variant="elevated" className="relative overflow-hidden p-6">
        {/* Background gradient */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br",
          config.gradient
        )} />
        
        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg", config.bgColor)}>
                  <Icon className={cn("h-5 w-5", config.color)} />
                </div>
                <div>
                  <h3 className="text-heading-sm font-semibold">{config.title}</h3>
                  <p className="text-label-sm text-muted-foreground">{config.subtitle}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-label-sm text-muted-foreground">Milestones</p>
              <p className="text-heading-md font-bold">
                <span className={config.color}>{unlockedCount}</span>
                <span className="text-muted-foreground">/{milestones.length}</span>
              </p>
            </div>
          </div>

          {/* Current Revenue Counter */}
          <div className="space-y-2">
            <p className="text-label-sm text-muted-foreground">Current Revenue</p>
            <motion.p 
              className="text-display-md font-bold tracking-tight"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              {formatCurrency(currentRevenue)}
            </motion.p>
          </div>

          {/* Next Milestone Progress */}
          {nextMilestone && (
            <div className="space-y-3 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className={cn("h-4 w-4", config.color)} />
                  <span className="text-label-sm font-medium">Next: {nextMilestone.display_name}</span>
                </div>
                <span className="text-label-sm text-muted-foreground">
                  {formatCurrency(nextMilestone.threshold_amount)}
                </span>
              </div>
              <Progress 
                value={nextMilestone.progress_percentage || 0} 
                className="h-2"
              />
              <div className="flex items-center justify-between text-label-sm text-muted-foreground">
                <span>
                  {formatCurrency(nextMilestone.threshold_amount - (nextMilestone.achieved_revenue || 0))} to go
                </span>
                <span className={cn("font-medium", config.color)}>
                  {Math.round(nextMilestone.progress_percentage || 0)}%
                </span>
              </div>
            </div>
          )}

          {/* Milestone Timeline Preview */}
          <div className="flex items-center gap-1">
            {milestones.slice(0, 5).map((milestone, index) => (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className={cn(
                  "flex-1 h-2 rounded-full transition-colors",
                  milestone.status === 'rewarded' && "bg-premium",
                  milestone.status === 'unlocked' && "bg-success",
                  milestone.status === 'approaching' && "bg-warning",
                  milestone.status === 'locked' && "bg-muted"
                )}
              />
            ))}
            {milestones.length > 5 && (
              <span className="text-label-xs text-muted-foreground ml-1">
                +{milestones.length - 5}
              </span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function DualTrackVisualizer({ annualLadder, cumulativeLadder }: DualTrackVisualizerProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TrackCard ladder={annualLadder} type="annual" />
      <TrackCard ladder={cumulativeLadder} type="cumulative" />
    </div>
  );
}
