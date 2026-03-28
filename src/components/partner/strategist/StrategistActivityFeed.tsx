import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TimelineView } from '@/components/partner/shared';
import type { TimelineItem } from '@/components/partner/shared';
import type { StrategistActivity } from '@/hooks/useStrategistChannel';
import {
  Eye,
  ListChecks,
  CalendarCheck,
  StickyNote,
  Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StrategistActivityFeedProps {
  activities: StrategistActivity[];
  className?: string;
}

const CATEGORY_CONFIG: Record<
  string,
  { icon: LucideIcon; color: string; label: string }
> = {
  review: { icon: Eye, color: 'text-blue-500', label: 'Reviews' },
  shortlist: { icon: ListChecks, color: 'text-emerald-500', label: 'Shortlists' },
  interview: { icon: CalendarCheck, color: 'text-amber-500', label: 'Interviews' },
  note: { icon: StickyNote, color: 'text-violet-500', label: 'Notes' },
  meeting: { icon: Video, color: 'text-primary', label: 'Meetings' },
};

export function StrategistActivityFeed({ activities, className }: StrategistActivityFeedProps) {
  const { t } = useTranslation('partner');

  const timelineItems: TimelineItem[] = useMemo(
    () =>
      activities.map((a) => {
        const config = CATEGORY_CONFIG[a.type] || CATEGORY_CONFIG.note;
        return {
          id: a.id,
          timestamp: a.created_at,
          title: a.description,
          description: a.context || undefined,
          category: a.type,
          icon: config.icon,
          iconColor: config.color,
          badge: a.type,
          badgeVariant: 'outline' as const,
          metadata: a.metadata
            ? Object.fromEntries(
                Object.entries(a.metadata)
                  .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
                  .map(([k, v]) => [k.replace(/_/g, ' '), String(v)])
              )
            : undefined,
        };
      }),
    [activities]
  );

  const filterCategories = useMemo(
    () =>
      Object.entries(CATEGORY_CONFIG).map(([value, config]) => ({
        value,
        label: config.label,
      })),
    []
  );

  return (
    <TimelineView
      items={timelineItems}
      filterCategories={filterCategories}
      maxVisible={15}
      showTimestamps
      emptyMessage={t('strategist.noActivity', 'Your strategist hasn\'t logged any activity yet')}
      className={className}
    />
  );
}
