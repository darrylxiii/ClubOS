import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TimelineView } from '@/components/partner/shared';
import type { TimelineItem } from '@/components/partner/shared';
import { UserPlus, FileText, Linkedin, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReengagementSignal } from '@/hooks/useNurturingSequence';

interface ReengagementSignalsProps {
  signals: ReengagementSignal[];
  className?: string;
}

const SIGNAL_ICON_MAP: Record<
  ReengagementSignal['signalType'],
  { icon: typeof UserPlus; color: string }
> = {
  profile_update: { icon: UserPlus, color: 'text-emerald-500' },
  new_application: { icon: FileText, color: 'text-primary' },
  linkedin_activity: { icon: Linkedin, color: 'text-blue-500' },
};

const FILTER_CATEGORIES = [
  { value: 'profile_update', label: 'Profile Updates' },
  { value: 'new_application', label: 'New Applications' },
  { value: 'linkedin_activity', label: 'LinkedIn Activity' },
];

export function ReengagementSignals({ signals, className }: ReengagementSignalsProps) {
  const { t } = useTranslation('partner');

  const timelineItems: TimelineItem[] = useMemo(() => {
    return signals.map((signal) => {
      const config = SIGNAL_ICON_MAP[signal.signalType];
      const isHot = signal.signalCount >= 2;

      return {
        id: signal.id,
        timestamp: signal.timestamp,
        title: signal.candidateName,
        description: signal.description,
        category: signal.signalType,
        icon: config.icon,
        iconColor: config.color,
        badge: isHot
          ? t('nurturing.signals.hot', 'Hot')
          : undefined,
        badgeVariant: isHot ? ('destructive' as const) : undefined,
        metadata: {
          [t('nurturing.signals.type', 'Type')]: signal.signalType
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          [t('nurturing.signals.action', 'Action')]: isHot
            ? t('nurturing.signals.priorityReachOut', 'Priority reach-out')
            : t('nurturing.signals.monitor', 'Monitor'),
        },
      };
    });
  }, [signals, t]);

  const localizedCategories = useMemo(
    () =>
      FILTER_CATEGORIES.map((cat) => ({
        value: cat.value,
        label: t(`nurturing.signals.category.${cat.value}`, cat.label),
      })),
    [t],
  );

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Flame className="h-4 w-4 text-amber-500" />
        {t('nurturing.signals.title', 'Re-engagement Signals')}
      </h3>
      <TimelineView
        items={timelineItems}
        filterCategories={localizedCategories}
        maxVisible={8}
        showTimestamps
        emptyMessage={t(
          'nurturing.signals.empty',
          'No re-engagement signals detected yet.',
        )}
      />
    </div>
  );
}
