import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Clock, Zap } from 'lucide-react';

interface OptimalOutreachTimingProps {
  heatmap: number[][];
  bestTimeLabel: string;
  className?: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BLOCK_LABELS = ['Morning', 'Midday', 'Afternoon', 'Evening'];
const BLOCK_HOURS = ['6-9 AM', '9-12 PM', '12-5 PM', '5-9 PM'];

function cellColor(value: number): string {
  if (value <= 0) return 'bg-muted/30';
  if (value < 0.25) return 'bg-emerald-500/15';
  if (value < 0.5) return 'bg-emerald-500/30';
  if (value < 0.75) return 'bg-emerald-500/50';
  return 'bg-emerald-500/80';
}

export function OptimalOutreachTiming({
  heatmap,
  bestTimeLabel,
  className,
}: OptimalOutreachTimingProps) {
  const { t } = useTranslation('partner');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'p-5 rounded-xl bg-card/30 backdrop-blur border border-border/20 space-y-4',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t('cri.outreach.title', 'Optimal Outreach Timing')}
        </h3>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Best time recommendation */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <Zap className="h-4 w-4 text-primary shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">
            {t('cri.outreach.bestTime', 'Best time to reach out')}
          </p>
          <p className="text-sm font-semibold">{bestTimeLabel}</p>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="space-y-1.5">
        {/* Column headers (days) */}
        <div className="grid grid-cols-[72px_repeat(7,1fr)] gap-1">
          <div /> {/* spacer */}
          {DAY_LABELS.map((day) => (
            <div key={day} className="text-[10px] text-muted-foreground text-center font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Rows (time blocks) */}
        {BLOCK_LABELS.map((block, blockIdx) => (
          <div key={block} className="grid grid-cols-[72px_repeat(7,1fr)] gap-1">
            <div className="text-[10px] text-muted-foreground flex items-center">
              <span className="truncate">{BLOCK_HOURS[blockIdx]}</span>
            </div>
            {DAY_LABELS.map((_, dayIdx) => {
              const value = heatmap[dayIdx]?.[blockIdx] ?? 0;
              return (
                <div
                  key={`${dayIdx}-${blockIdx}`}
                  className={cn(
                    'h-7 rounded-md transition-colors duration-200',
                    cellColor(value),
                  )}
                  title={`${DAY_LABELS[dayIdx]} ${BLOCK_HOURS[blockIdx]}: ${Math.round(value * 100)}% likelihood`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>{t('cri.outreach.low', 'Low')}</span>
        <div className="flex gap-0.5">
          {['bg-muted/30', 'bg-emerald-500/15', 'bg-emerald-500/30', 'bg-emerald-500/50', 'bg-emerald-500/80'].map(
            (c, i) => (
              <div key={i} className={cn('w-4 h-2.5 rounded-sm', c)} />
            ),
          )}
        </div>
        <span>{t('cri.outreach.high', 'High')}</span>
      </div>
    </motion.div>
  );
}
