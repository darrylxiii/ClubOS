import { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RevenueCounterProps {
  value: number;
  label: string;
  target?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  trend?: number;
}

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 50, damping: 15 });
  const display = useTransform(spring, (current) =>
    new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(current))
  );

  const [displayValue, setDisplayValue] = useState('€0');

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => {
      setDisplayValue(v);
    });
    return unsubscribe;
  }, [display]);

  return <span>{displayValue}</span>;
}

export function RevenueCounter({
  value,
  label,
  target,
  className,
  size = 'lg',
  showTrend = false,
  trend,
}: RevenueCounterProps) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  const sizeClasses = {
    sm: {
      container: 'p-4',
      label: 'text-label-sm',
      value: 'text-heading-lg',
      icon: 'h-4 w-4',
    },
    md: {
      container: 'p-5',
      label: 'text-label-md',
      value: 'text-display-sm',
      icon: 'h-5 w-5',
    },
    lg: {
      container: 'p-6',
      label: 'text-label-md',
      value: 'text-display-md',
      icon: 'h-6 w-6',
    },
  };

  const classes = sizeClasses[size];
  const progressPercent = target ? Math.min(100, (value / target) * 100) : null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'relative overflow-hidden rounded-xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/50',
        classes.container,
        className
      )}
    >
      {/* Background Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-premium/5" />
      
      {/* Sparkle for approaching target */}
      {progressPercent && progressPercent >= 80 && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-3 right-3"
        >
          <Sparkles className="h-5 w-5 text-premium animate-pulse" />
        </motion.div>
      )}

      <div className="relative z-10 space-y-2">
        {/* Label */}
        <div className="flex items-center gap-2">
          <span className={cn('text-muted-foreground', classes.label)}>{label}</span>
          {showTrend && trend !== undefined && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-label-xs font-medium',
                trend >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              )}
            >
              <TrendingUp className={cn('h-3 w-3', trend < 0 && 'rotate-180')} />
              {Math.abs(trend)}%
            </motion.span>
          )}
        </div>

        {/* Value */}
        <motion.p
          className={cn('font-bold tracking-tight', classes.value)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {hasAnimated ? <AnimatedNumber value={value} /> : '€0'}
        </motion.p>

        {/* Progress to Target */}
        {target && (
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-label-sm">
              <span className="text-muted-foreground">Target</span>
              <span className="font-medium">
                {new Intl.NumberFormat('nl-NL', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                }).format(target)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                className={cn(
                  'h-full rounded-full',
                  progressPercent && progressPercent >= 100
                    ? 'bg-success'
                    : progressPercent && progressPercent >= 80
                    ? 'bg-warning'
                    : 'bg-primary'
                )}
              />
            </div>
            <p className="text-label-sm text-muted-foreground text-right">
              {Math.round(progressPercent || 0)}% achieved
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
