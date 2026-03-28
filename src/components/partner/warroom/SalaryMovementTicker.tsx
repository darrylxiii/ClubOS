import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { motion } from '@/lib/motion';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';
import { TrendSparkline } from '@/components/partner/shared';
import type { SalaryMovement } from '@/hooks/useTalentWarRoom';

interface SalaryMovementTickerProps {
  movements: SalaryMovement[];
  className?: string;
}

const DIRECTION_CONFIG = {
  up: { icon: TrendingUp, color: 'text-rose-500', label: '+' },
  down: { icon: TrendingDown, color: 'text-emerald-500', label: '' },
  stable: { icon: Minus, color: 'text-muted-foreground', label: '' },
};

const SPARKLINE_COLOR_MAP: Record<string, 'rose' | 'emerald' | 'muted'> = {
  up: 'rose',
  down: 'emerald',
  stable: 'muted',
};

export function SalaryMovementTicker({ movements, className }: SalaryMovementTickerProps) {
  const { t } = useTranslation('partner');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'p-5 rounded-xl bg-card/20 backdrop-blur border border-border/20',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">
          {t('warRoom.salary.title', 'Salary Movements')}
        </h3>
      </div>

      {/* Ticker list */}
      {movements.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 py-4 text-center">
          {t('warRoom.salary.empty', 'Not enough salary data for trend analysis')}
        </p>
      ) : (
        <div className="space-y-2">
          {movements.map((movement, i) => {
            const dirConfig = DIRECTION_CONFIG[movement.direction];
            const DirIcon = dirConfig.icon;
            const sparkColor = SPARKLINE_COLOR_MAP[movement.direction];

            return (
              <motion.div
                key={movement.category}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.2 }}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/10 hover:bg-muted/15 transition-colors"
              >
                {/* Arrow indicator */}
                <DirIcon className={cn('h-3.5 w-3.5 shrink-0', dirConfig.color)} />

                {/* Category + change */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-medium truncate">{movement.category}</span>
                    <span className={cn('text-[11px] font-semibold tabular-nums', dirConfig.color)}>
                      {dirConfig.label}{movement.changePercent}%
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {t('warRoom.salary.thisQuarter', 'this quarter')}
                  </span>
                </div>

                {/* Sparkline */}
                {movement.sparklineData.length >= 2 && (
                  <div className="w-16 shrink-0">
                    <TrendSparkline
                      data={movement.sparklineData}
                      color={sparkColor}
                      height={20}
                      width={64}
                      showEndDot={false}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
