import { motion } from 'framer-motion';
import { Lock, Unlock, Trophy, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RevenueMilestone } from '@/hooks/useRevenueLadder';

interface MilestoneCardProps {
  milestone: RevenueMilestone;
  onClick?: () => void;
  isNext?: boolean;
}

const statusConfig = {
  locked: {
    icon: Lock,
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
    badge: 'bg-muted text-muted-foreground',
    glow: '',
  },
  approaching: {
    icon: TrendingUp,
    color: 'text-warning',
    bg: 'bg-warning/10',
    badge: 'bg-warning/20 text-warning border-warning/30',
    glow: 'shadow-[0_0_30px_hsl(var(--warning)/0.2)]',
  },
  unlocked: {
    icon: Unlock,
    color: 'text-success',
    bg: 'bg-success/10',
    badge: 'bg-success/20 text-success border-success/30',
    glow: 'shadow-[0_0_40px_hsl(var(--success)/0.25)]',
  },
  rewarded: {
    icon: Trophy,
    color: 'text-premium',
    bg: 'bg-premium/10',
    badge: 'bg-premium/20 text-premium border-premium/30',
    glow: 'shadow-[0_0_50px_hsl(var(--premium)/0.3)]',
  },
};

export function MilestoneCard({ milestone, onClick, isNext }: MilestoneCardProps) {
  const status = milestone.status as keyof typeof statusConfig;
  const config = statusConfig[status] || statusConfig.locked;
  const StatusIcon = config.icon;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        variant="interactive"
        onClick={onClick}
        className={cn(
          "relative overflow-hidden p-6 transition-all duration-300",
          config.glow,
          isNext && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background"
        )}
      >
        {/* Decorative gradient overlay */}
        <div className={cn(
          "absolute inset-0 opacity-30",
          config.bg
        )} />
        
        {/* Next milestone indicator */}
        {isNext && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-1 -right-1"
          >
            <Badge className="bg-primary text-primary-foreground gap-1">
              <Sparkles className="h-3 w-3" />
              Next
            </Badge>
          </motion.div>
        )}

        <div className="relative z-10 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-label-sm text-muted-foreground uppercase tracking-wider">
                Milestone
              </p>
              <h3 className="text-heading-md font-semibold">
                {milestone.display_name}
              </h3>
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              config.bg
            )}>
              <StatusIcon className={cn("h-6 w-6", config.color)} />
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <p className="text-display-sm font-bold tracking-tight">
              {formatCurrency(milestone.threshold_amount)}
            </p>
            {milestone.description && (
              <p className="text-body-sm text-muted-foreground line-clamp-2">
                {milestone.description}
              </p>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-label-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className={cn("font-medium", config.color)}>
                {Math.min(100, Math.round(milestone.progress_percentage || 0))}%
              </span>
            </div>
            <Progress 
              value={Math.min(100, milestone.progress_percentage || 0)} 
              className="h-2"
            />
            <div className="flex items-center justify-between text-label-sm text-muted-foreground">
              <span>{formatCurrency(milestone.achieved_revenue || 0)}</span>
              <span>{formatCurrency(milestone.threshold_amount)}</span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <Badge variant="outline" className={cn("capitalize", config.badge)}>
              {status}
            </Badge>
            {milestone.unlocked_at && (
              <span className="text-label-sm text-muted-foreground">
                {new Date(milestone.unlocked_at).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
