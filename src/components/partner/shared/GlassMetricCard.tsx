import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TrendSparkline } from './TrendSparkline';
import { motion } from '@/lib/motion';

interface GlassMetricCardProps {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Metric label */
  label: string;
  /** Primary display value */
  value: string | number;
  /** Trend direction */
  trend?: 'up' | 'down' | 'neutral';
  /** Trend percentage label (e.g. "+12%") */
  trendLabel?: string;
  /** Sparkline data points */
  sparklineData?: number[];
  /** Color theme */
  color?: 'primary' | 'emerald' | 'amber' | 'rose' | 'muted';
  /** Optional subtitle below value */
  subtitle?: string;
  /** Animation delay for stagger */
  delay?: number;
  className?: string;
}

const TREND_CONFIG = {
  up: { icon: TrendingUp, color: 'text-emerald-500' },
  down: { icon: TrendingDown, color: 'text-rose-500' },
  neutral: { icon: Minus, color: 'text-muted-foreground' },
};

const ICON_BG = {
  primary: 'bg-primary/10 text-primary',
  emerald: 'bg-emerald-500/10 text-emerald-500',
  amber: 'bg-amber-500/10 text-amber-500',
  rose: 'bg-rose-500/10 text-rose-500',
  muted: 'bg-muted text-muted-foreground',
};

export function GlassMetricCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  sparklineData,
  color = 'primary',
  subtitle,
  delay = 0,
  className,
}: GlassMetricCardProps) {
  const TrendIcon = trend ? TREND_CONFIG[trend].icon : null;
  const trendColor = trend ? TREND_CONFIG[trend].color : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'p-4 rounded-xl bg-card/30 backdrop-blur border border-border/20',
        'hover:border-primary/20 transition-colors duration-200',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Label + icon */}
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('p-1.5 rounded-lg shrink-0', ICON_BG[color])}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs text-muted-foreground truncate">{label}</span>
          </div>

          {/* Value */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">{value}</span>
            {trend && TrendIcon && (
              <span className={cn('flex items-center gap-0.5 text-xs font-medium', trendColor)}>
                <TrendIcon className="h-3 w-3" />
                {trendLabel}
              </span>
            )}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>

        {/* Sparkline */}
        {sparklineData && sparklineData.length >= 2 && (
          <div className="w-20 shrink-0 pt-1">
            <TrendSparkline
              data={sparklineData}
              color={color}
              height={28}
              width={80}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
