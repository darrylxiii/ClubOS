import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { motion } from '@/lib/motion';

interface LivePulseIndicatorProps {
  lastUpdated: Date | null;
  className?: string;
}

type ConnectionStatus = 'live' | 'stale' | 'disconnected';

function getStatus(lastUpdated: Date | null): ConnectionStatus {
  if (!lastUpdated) return 'disconnected';
  const ageMs = Date.now() - lastUpdated.getTime();
  if (ageMs < 5 * 60 * 1000) return 'live';
  if (ageMs < 15 * 60 * 1000) return 'stale';
  return 'disconnected';
}

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; pulseColor: string; label: string }> = {
  live: {
    color: 'bg-emerald-500',
    pulseColor: 'bg-emerald-500/50',
    label: 'Live',
  },
  stale: {
    color: 'bg-amber-500',
    pulseColor: 'bg-amber-500/50',
    label: 'Stale',
  },
  disconnected: {
    color: 'bg-rose-500',
    pulseColor: 'bg-rose-500/50',
    label: 'Offline',
  },
};

export function LivePulseIndicator({ lastUpdated, className }: LivePulseIndicatorProps) {
  const { t } = useTranslation('partner');
  const status = getStatus(lastUpdated);
  const config = STATUS_CONFIG[status];

  const timeLabel = lastUpdated
    ? t('warRoom.lastUpdated', 'Updated {{time}}', {
        time: formatTimeAgo(lastUpdated),
      })
    : t('warRoom.noData', 'No data');

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex items-center justify-center w-3 h-3">
        {status === 'live' && (
          <motion.div
            className={cn('absolute inset-0 rounded-full', config.pulseColor)}
            animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <div className={cn('w-2 h-2 rounded-full', config.color)} />
      </div>
      <span className="text-xs font-medium text-muted-foreground">
        {t(`warRoom.status.${status}`, config.label)}
      </span>
      <span className="text-[10px] text-muted-foreground/60">{timeLabel}</span>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
