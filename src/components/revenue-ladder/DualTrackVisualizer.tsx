import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Banknote, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RevenueLadder, useRevenueStats } from '@/hooks/useRevenueLadder';

interface DualTrackVisualizerProps {
  annualLadder?: RevenueLadder;
  cumulativeLadder?: RevenueLadder;
}

function TrackCard({ 
  ladder, 
  type,
  revenueData,
}: { 
  ladder?: RevenueLadder; 
  type: 'annual' | 'cumulative';
  revenueData?: {
    booked: number;
    collected: number;
    year?: number;
  };
}) {
  const config = type === 'annual' 
    ? {
        icon: Calendar,
        title: 'Annual Revenue',
        subtitle: `${revenueData?.year || new Date().getFullYear()} YTD`,
        gradient: 'from-primary/20 via-primary/10 to-transparent',
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      }
    : {
        icon: Infinity,
        title: 'Lifetime Revenue',
        subtitle: 'Since founding',
        gradient: 'from-premium/20 via-premium/10 to-transparent',
        color: 'text-premium',
        bgColor: 'bg-premium/10',
      };

  const Icon = config.icon;
  const milestones = ladder?.revenue_milestones || [];
  const unlockedCount = milestones.filter(m => m.status === 'unlocked' || m.status === 'rewarded').length;
  
  // Use real Moneybird revenue data (net, excluding VAT)
  const currentRevenue = revenueData?.booked || milestones.reduce((max, m) => Math.max(max, m.achieved_revenue || 0), 0);
  const collectedRevenue = revenueData?.collected || 0;
  
  const nextMilestone = milestones.find(m => m.status === 'locked' || m.status === 'approaching');
  
  // Calculate progress based on real revenue
  const progressPercentage = nextMilestone 
    ? Math.min(100, (currentRevenue / nextMilestone.threshold_amount) * 100)
    : 100;
  
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `€${(amount / 1000).toFixed(0)}K`;
    }
    return `€${amount.toFixed(0)}`;
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

          {/* Current Revenue Counter - Dual Display */}
          <div className="space-y-3">
            {/* Booked Revenue (Primary) */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <p className="text-label-sm text-muted-foreground">Revenue (excl. VAT)</p>
              </div>
              <motion.p 
                className="text-display-md font-bold tracking-tight"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                {formatCurrency(currentRevenue)}
              </motion.p>
            </div>
            
            {/* Collected Revenue (Secondary) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-success cursor-help">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-label-sm">
                    {formatCurrency(collectedRevenue)} collected
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cash received (paid invoices only)</p>
              </TooltipContent>
            </Tooltip>
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
                value={progressPercentage} 
                className="h-2"
              />
              <div className="flex items-center justify-between text-label-sm text-muted-foreground">
                <span>
                  {formatCurrency(Math.max(0, nextMilestone.threshold_amount - currentRevenue))} to go
                </span>
                <span className={cn("font-medium", config.color)}>
                  {Math.round(progressPercentage)}%
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
  const { data: revenueStats } = useRevenueStats();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TrackCard 
        ladder={annualLadder} 
        type="annual" 
        revenueData={revenueStats?.annual}
      />
      <TrackCard 
        ladder={cumulativeLadder} 
        type="cumulative" 
        revenueData={revenueStats?.lifetime}
      />
    </div>
  );
}
