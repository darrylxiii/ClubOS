import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MilestoneMarker {
  position: number; // 0-100
  label?: string;
  reached?: boolean;
}

interface PremiumProgressBarProps {
  value: number; // 0-100
  className?: string;
  height?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'premium';
  showPercentage?: boolean;
  animated?: boolean;
  milestoneMarkers?: MilestoneMarker[];
  showShimmer?: boolean;
}

const heightClasses = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

const gradientClasses = {
  default: 'from-primary via-primary/90 to-primary/80',
  success: 'from-success via-success/90 to-success/80',
  warning: 'from-warning via-warning/90 to-warning/80',
  premium: 'from-premium via-primary to-premium',
};

export function PremiumProgressBar({
  value,
  className,
  height = 'md',
  variant = 'default',
  showPercentage = false,
  animated = true,
  milestoneMarkers = [],
  showShimmer = true,
}: PremiumProgressBarProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const clampedValue = Math.min(100, Math.max(0, value));

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedValue(clampedValue);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedValue(clampedValue);
    }
  }, [clampedValue, animated]);

  return (
    <div className={cn("relative", className)}>
      {/* Track */}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full",
          "bg-muted/50 border border-border/30",
          heightClasses[height]
        )}
      >
        {/* Filled Progress */}
        <motion.div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            "bg-gradient-to-r",
            gradientClasses[variant],
            "shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${animatedValue}%` }}
          transition={{
            duration: animated ? 1 : 0,
            ease: [0.34, 1.56, 0.64, 1],
          }}
        >
          {/* Shimmer Effect */}
          {showShimmer && animatedValue > 0 && animatedValue < 100 && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
                ease: 'easeInOut',
              }}
            />
          )}

          {/* Leading Edge Glow */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/80 blur-sm" />
        </motion.div>

        {/* Milestone Markers */}
        {milestoneMarkers.map((marker, index) => (
          <div
            key={index}
            className="absolute top-0 bottom-0 w-0.5"
            style={{ left: `${marker.position}%` }}
          >
            <div
              className={cn(
                "h-full w-full",
                marker.reached
                  ? "bg-success"
                  : animatedValue >= marker.position
                    ? "bg-primary"
                    : "bg-muted-foreground/30"
              )}
            />
            {/* Marker Dot */}
            <div
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                "w-2 h-2 rounded-full border-2 border-background",
                marker.reached
                  ? "bg-success"
                  : animatedValue >= marker.position
                    ? "bg-primary"
                    : "bg-muted"
              )}
            />
          </div>
        ))}
      </div>

      {/* Percentage Badge */}
      {showPercentage && (
        <motion.div
          className="absolute -top-1 transform -translate-y-full"
          style={{ left: `${animatedValue}%` }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <div
            className={cn(
              "px-2 py-0.5 rounded-md text-label-xs font-medium",
              "bg-foreground text-background",
              "shadow-glass-sm"
            )}
          >
            {Math.round(animatedValue)}%
          </div>
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground" />
        </motion.div>
      )}

      {/* Marker Labels */}
      {milestoneMarkers.some((m) => m.label) && (
        <div className="relative mt-2">
          {milestoneMarkers
            .filter((m) => m.label)
            .map((marker, index) => (
              <span
                key={index}
                className={cn(
                  "absolute text-label-xs transform -translate-x-1/2",
                  marker.reached || animatedValue >= marker.position
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
                style={{ left: `${marker.position}%` }}
              >
                {marker.label}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
