import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import type { Bottleneck } from '@/hooks/useAIChiefOfStaff';

// ── Config ─────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  Bottleneck['severity'],
  { color: string; badgeClass: string; barClass: string }
> = {
  critical: {
    color: 'text-rose-500',
    badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
    barClass: 'bg-rose-500',
  },
  warning: {
    color: 'text-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    barClass: 'bg-amber-500',
  },
  info: {
    color: 'text-sky-500',
    badgeClass: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
    barClass: 'bg-sky-500',
  },
};

// ── Props ──────────────────────────────────────────────────────────

interface BottleneckFlagPanelProps {
  bottlenecks: Bottleneck[];
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────

export function BottleneckFlagPanel({ bottlenecks, className }: BottleneckFlagPanelProps) {
  const { t } = useTranslation('partner');

  return (
    <div className={cn('glass-card p-5 rounded-xl', className)}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold">
          {t('chiefOfStaff.bottlenecks.title', 'Pipeline Bottlenecks')}
        </h3>
        {bottlenecks.length > 0 && (
          <Badge variant="outline" className="text-[10px] ml-auto">
            {bottlenecks.length}
          </Badge>
        )}
      </div>

      {bottlenecks.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          {t('chiefOfStaff.bottlenecks.empty', 'No bottlenecks detected -- pipeline is flowing smoothly.')}
        </div>
      ) : (
        <div className="space-y-3">
          {bottlenecks.map((bn, index) => {
            const config = SEVERITY_CONFIG[bn.severity];
            const progressPercent = Math.min(
              100,
              Math.round((bn.avgDays / (bn.benchmarkDays * 4)) * 100),
            );

            return (
              <motion.div
                key={bn.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.25 }}
                className="p-3 rounded-lg bg-card/30 backdrop-blur border border-border/20 space-y-2"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] py-0 px-1.5 capitalize shrink-0', config.badgeClass)}
                    >
                      {bn.stage}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t('chiefOfStaff.bottlenecks.avgDays', '{{days}} days avg', {
                        days: bn.avgDays,
                      })}
                    </span>
                  </div>
                  <span className={cn('text-xs font-medium', config.color)}>
                    {bn.candidatesStuck}{' '}
                    {t('chiefOfStaff.bottlenecks.stuck', 'stuck')}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ delay: index * 0.05 + 0.2, duration: 0.4, ease: 'easeOut' }}
                    className={cn('h-full rounded-full', config.barClass)}
                  />
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground">{bn.message}</p>

                {/* Action link */}
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-primary gap-1">
                  {t('chiefOfStaff.bottlenecks.viewCandidates', 'View candidates')}
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
