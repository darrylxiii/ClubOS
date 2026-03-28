import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UserPlus, ExternalLink, Signal } from 'lucide-react';
import type { MarketAlert } from '@/hooks/useMarketAlerts';

interface CompetitorMovementCardProps {
  alert: MarketAlert;
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
}

function SignalStrength({ level }: { level: number }) {
  return (
    <div className="flex items-end gap-0.5 h-4" title={`Signal: ${level}/4`}>
      {[1, 2, 3, 4].map(bar => (
        <div
          key={bar}
          className={cn(
            'w-1 rounded-sm transition-colors',
            bar <= level ? 'bg-amber-500' : 'bg-muted',
          )}
          style={{ height: `${bar * 25}%` }}
        />
      ))}
    </div>
  );
}

export function CompetitorMovementCard({
  alert,
  onDismiss,
  onSnooze,
}: CompetitorMovementCardProps) {
  const { t } = useTranslation('partner');
  const signalLevel = alert.metadata?.signal_strength ?? 3;
  const isCritical = alert.severity === 'critical';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'glass-card p-4 rounded-xl border transition-all duration-200',
        isCritical
          ? 'border-destructive/40 bg-destructive/5 dark:bg-destructive/10'
          : 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={isCritical ? 'destructive' : 'outline'}
              className="text-xs"
            >
              {t('marketAlerts.categories.competitor', 'Competitor Movement')}
            </Badge>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Signal className="h-3 w-3" />
              <SignalStrength level={signalLevel} />
            </div>
          </div>

          {/* Message */}
          <p className="text-sm font-medium">{alert.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {alert.action_url && (
              <Button size="sm" variant="default" className="h-7 text-xs gap-1" asChild>
                <a href={alert.action_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  {t('marketAlerts.actions.viewProfile', 'View Profile')}
                </a>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => onSnooze(alert.id)}
            >
              <UserPlus className="h-3 w-3" />
              {t('marketAlerts.actions.addToPipeline', 'Add to Pipeline')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs ml-auto"
              onClick={() => onDismiss(alert.id)}
            >
              {t('marketAlerts.actions.dismiss', 'Dismiss')}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
