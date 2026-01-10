import { motion } from 'framer-motion';
import { Lock, Unlock, Trophy, TrendingUp, Sparkles, Target, Clock, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RevenueMilestone } from '@/hooks/useRevenueLadder';
import { PremiumProgressBar } from './PremiumProgressBar';

interface MilestoneCardProps {
  milestone: RevenueMilestone;
  onClick?: () => void;
  onEdit?: (milestone: RevenueMilestone, e: React.MouseEvent) => void;
  isNext?: boolean;
  isAdmin?: boolean;
}

const statusConfig = {
  locked: {
    icon: Lock,
    color: 'text-muted-foreground',
    bg: 'bg-muted/30',
    border: 'border-border/30',
    badge: 'bg-muted text-muted-foreground border-muted',
    glow: '',
    progressVariant: 'default' as const,
    overlay: 'bg-gradient-to-br from-muted/5 to-muted/10',
  },
  approaching: {
    icon: TrendingUp,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    badge: 'bg-warning/15 text-warning border-warning/30',
    glow: 'shadow-[0_0_40px_hsl(var(--warning)/0.15)]',
    progressVariant: 'warning' as const,
    overlay: 'bg-gradient-to-br from-warning/5 to-warning/10',
  },
  unlocked: {
    icon: Unlock,
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
    badge: 'bg-success/15 text-success border-success/30',
    glow: 'shadow-[0_0_50px_hsl(var(--success)/0.2)]',
    progressVariant: 'success' as const,
    overlay: 'bg-gradient-to-br from-success/5 to-success/10',
  },
  rewarded: {
    icon: Trophy,
    color: 'text-premium',
    bg: 'bg-premium/10',
    border: 'border-premium/40',
    badge: 'bg-premium/15 text-premium border-premium/30',
    glow: 'shadow-[0_0_60px_hsl(var(--premium)/0.25)]',
    progressVariant: 'premium' as const,
    overlay: 'bg-gradient-to-br from-premium/5 via-primary/5 to-premium/10',
  },
};

export function MilestoneCard({ milestone, onClick, onEdit, isNext, isAdmin }: MilestoneCardProps) {
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

  const progressPercent = Math.min(100, milestone.progress_percentage || 0);
  const remainingAmount = Math.max(0, milestone.threshold_amount - (milestone.achieved_revenue || 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      whileHover={{ 
        scale: isNext ? 1.02 : 1.01, 
        y: -4,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative",
        isNext && "z-10"
      )}
    >
      {/* Next Milestone Spotlight Ring */}
      {isNext && (
        <>
          <motion.div
            className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary via-premium to-primary opacity-75 blur-sm"
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{ backgroundSize: '200% 200%' }}
          />
          <motion.div
            className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary via-premium to-primary"
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{ backgroundSize: '200% 200%' }}
          />
        </>
      )}

      <Card
        variant="interactive"
        onClick={onClick}
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          "backdrop-blur-sm",
          isNext ? "p-6 md:p-7" : "p-5 md:p-6",
          config.glow,
          config.border,
          isNext && "border-0"
        )}
      >
        {/* Status-based Gradient Overlay */}
        <div className={cn("absolute inset-0", config.overlay)} />

        {/* Approaching Milestone Pulse Effect */}
        {status === 'approaching' && (
          <motion.div
            className="absolute inset-0 bg-warning/5"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Rewarded Shimmer Effect */}
        {status === 'rewarded' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-premium/10 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
          />
        )}
        
        {/* Next Milestone Indicator Badge */}
        {isNext && (
          <motion.div
            initial={{ opacity: 0, scale: 0, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="absolute -top-0 right-4"
          >
            <Badge className="bg-primary text-primary-foreground gap-1.5 px-3 py-1.5 shadow-glass-md">
              <Sparkles className="h-3.5 w-3.5" />
              Next Up
            </Badge>
          </motion.div>
        )}

        <div className="relative z-10 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1">
              <p className="text-label-xs text-muted-foreground uppercase tracking-wider font-medium">
                Milestone
              </p>
              <h3 className={cn(
                "font-semibold leading-tight",
                isNext ? "text-heading-lg" : "text-heading-md"
              )}>
                {milestone.display_name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-60 hover:opacity-100"
                  onClick={(e) => onEdit(milestone, e)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              <motion.div 
                className={cn(
                  "p-3 rounded-xl shrink-0",
                  config.bg,
                  "border",
                  config.border
                )}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <StatusIcon className={cn(
                  isNext ? "h-6 w-6" : "h-5 w-5",
                  config.color
                )} />
              </motion.div>
            </div>
          </div>

          {/* Amount Display */}
          <div className="space-y-1">
            <motion.p 
              className={cn(
                "font-bold tracking-tight",
                isNext ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"
              )}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              {formatCurrency(milestone.threshold_amount)}
            </motion.p>
            {milestone.description && (
              <p className="text-body-sm text-muted-foreground line-clamp-2">
                {milestone.description}
              </p>
            )}
          </div>

          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-label-sm text-muted-foreground">Progress</span>
              <span className={cn("text-label-sm font-semibold", config.color)}>
                {Math.round(progressPercent)}%
              </span>
            </div>
            
            <PremiumProgressBar
              value={progressPercent}
              height={isNext ? 'lg' : 'md'}
              variant={config.progressVariant}
              showShimmer={status === 'approaching'}
            />

            <div className="flex items-center justify-between text-label-sm">
              <span className="text-muted-foreground">
                {formatCurrency(milestone.achieved_revenue || 0)}
              </span>
              {status === 'approaching' && remainingAmount > 0 && (
                <span className="text-warning font-medium flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {formatCurrency(remainingAmount)} to go
                </span>
              )}
              {status !== 'approaching' && (
                <span className="text-muted-foreground">
                  {formatCurrency(milestone.threshold_amount)}
                </span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border/30">
            <Badge 
              variant="outline" 
              className={cn(
                "capitalize text-label-xs font-medium",
                config.badge
              )}
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              {status}
            </Badge>
            {milestone.unlocked_at && (
              <span className="text-label-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
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
