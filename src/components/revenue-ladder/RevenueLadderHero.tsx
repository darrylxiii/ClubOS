import { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Sparkles, Target, Trophy, Flame, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface RevenueLadderHeroProps {
  currentRevenue: number;
  previousYearRevenue?: number;
  nextMilestoneAmount?: number;
  totalMilestones: number;
  unlockedMilestones: number;
  approachingMilestones: number;
  rewardedMilestones: number;
  className?: string;
}

function AnimatedDigits({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 30, damping: 20 });
  const [displayValue, setDisplayValue] = useState('€0');

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (current) => {
      setDisplayValue(
        new Intl.NumberFormat('nl-NL', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Math.round(current))
      );
    });
    return unsubscribe;
  }, [spring]);

  return (
    <span className="tabular-nums">{displayValue}</span>
  );
}

export function RevenueLadderHero({
  currentRevenue,
  previousYearRevenue,
  nextMilestoneAmount,
  totalMilestones,
  unlockedMilestones,
  approachingMilestones,
  rewardedMilestones,
  className,
}: RevenueLadderHeroProps) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const yoyChange = previousYearRevenue && previousYearRevenue > 0
    ? Math.round(((currentRevenue - previousYearRevenue) / previousYearRevenue) * 100)
    : null;

  const amountToNext = nextMilestoneAmount ? nextMilestoneAmount - currentRevenue : null;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  const stats = [
    {
      label: 'Total',
      value: totalMilestones,
      icon: Target,
      color: 'text-foreground',
      bg: 'bg-muted/50',
    },
    {
      label: 'Unlocked',
      value: unlockedMilestones,
      icon: Trophy,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Approaching',
      value: approachingMilestones,
      icon: Flame,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'Rewarded',
      value: rewardedMilestones,
      icon: Sparkles,
      color: 'text-premium',
      bg: 'bg-premium/10',
    },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl md:rounded-3xl",
        "bg-gradient-to-br from-card via-card to-muted/20",
        "border border-border/50",
        "shadow-glass-xl",
        className
      )}
    >
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 bg-[var(--gradient-mesh)] opacity-50" />
      
      {/* Subtle Shimmer Effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
      />

      {/* Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-32 bg-primary/10 blur-3xl rounded-full" />

      <div className="relative z-10 p-6 md:p-8 lg:p-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-xl bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <span className="text-label-sm text-muted-foreground uppercase tracking-wider font-medium">
            Revenue Performance
          </span>
        </div>

        {/* Main Revenue Display */}
        <div className="space-y-4 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col sm:flex-row sm:items-end gap-4"
          >
            {/* Big Number */}
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text">
              {hasAnimated ? <AnimatedDigits value={currentRevenue} /> : '€0'}
            </h2>

            {/* YoY Trend Badge */}
            {yoyChange !== null && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Badge
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium gap-1.5",
                    yoyChange >= 0
                      ? "bg-success/10 text-success border-success/30 hover:bg-success/20"
                      : "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20"
                  )}
                  variant="outline"
                >
                  {yoyChange >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {yoyChange >= 0 ? '+' : ''}{yoyChange}% YoY
                </Badge>
              </motion.div>
            )}
          </motion.div>

          <p className="text-body-md text-muted-foreground">
            Total Revenue Achieved
            {amountToNext !== null && amountToNext > 0 && (
              <span className="ml-2 text-primary font-medium">
                • €{amountToNext.toLocaleString('nl-NL')} to next milestone
              </span>
            )}
          </p>
        </div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className={cn(
                "relative overflow-hidden rounded-xl p-4",
                "bg-gradient-to-br from-card/80 to-card/40",
                "border border-border/30",
                "backdrop-blur-sm",
                "transition-all duration-300 hover:shadow-glass-md hover:border-border/50"
              )}
            >
              {/* Accent Background */}
              <div className={cn("absolute inset-0 opacity-30", stat.bg)} />
              
              <div className="relative z-10 flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-label-sm text-muted-foreground">{stat.label}</p>
                  <p className={cn("text-2xl md:text-3xl font-bold", stat.color)}>
                    {stat.value}
                  </p>
                </div>
                <div className={cn("p-2 rounded-lg", stat.bg)}>
                  <stat.icon className={cn("h-4 w-4 md:h-5 md:w-5", stat.color)} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
