import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TimelineView } from '@/components/partner/shared';
import type { TimelineItem } from '@/components/partner/shared';
import type { UnifiedTimelineEntry } from '@/hooks/useUnifiedCandidateTimeline';
import {
  MessageSquare,
  Mail,
  CalendarCheck,
  ArrowRightLeft,
  ClipboardList,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface UnifiedInteractionTimelineProps {
  timeline: UnifiedTimelineEntry[];
  isLoading: boolean;
  className?: string;
}

const TYPE_CONFIG: Record<
  UnifiedTimelineEntry['type'],
  { icon: LucideIcon; color: string; label: string }
> = {
  message: { icon: MessageSquare, color: 'text-blue-500', label: 'Messages' },
  email: { icon: Mail, color: 'text-indigo-500', label: 'Emails' },
  meeting: { icon: CalendarCheck, color: 'text-emerald-500', label: 'Meetings' },
  stage_change: { icon: ArrowRightLeft, color: 'text-amber-500', label: 'Stage Changes' },
  scorecard: { icon: ClipboardList, color: 'text-rose-500', label: 'Scorecards' },
};

function sentimentBadge(sentiment: number | null | undefined): {
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
} {
  if (sentiment == null) return {};
  if (sentiment >= 70) return { badge: 'Positive', badgeVariant: 'default' };
  if (sentiment >= 40) return { badge: 'Neutral', badgeVariant: 'secondary' };
  return { badge: 'Negative', badgeVariant: 'destructive' };
}

export function UnifiedInteractionTimeline({
  timeline,
  isLoading,
  className,
}: UnifiedInteractionTimelineProps) {
  const { t } = useTranslation('partner');

  const filterCategories = useMemo(
    () => [
      { value: 'message', label: t('cri.timeline.messages', 'Messages') },
      { value: 'email', label: t('cri.timeline.emails', 'Emails') },
      { value: 'meeting', label: t('cri.timeline.meetings', 'Meetings') },
      { value: 'stage_change', label: t('cri.timeline.stageChanges', 'Stage Changes') },
      { value: 'scorecard', label: t('cri.timeline.scorecards', 'Scorecards') },
    ],
    [t],
  );

  const items: TimelineItem[] = useMemo(
    () =>
      timeline.map((entry) => {
        const config = TYPE_CONFIG[entry.type];
        const { badge, badgeVariant } = sentimentBadge(entry.sentiment);
        return {
          id: entry.id,
          timestamp: entry.timestamp,
          title: entry.title,
          description: entry.description,
          category: entry.type,
          icon: config.icon,
          iconColor: config.color,
          badge,
          badgeVariant,
          metadata: entry.metadata
            ? Object.fromEntries(
                Object.entries(entry.metadata)
                  .filter(([, v]) => v != null && v !== '')
                  .map(([k, v]) => [k, String(v)]),
              )
            : undefined,
        };
      }),
    [timeline],
  );

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-[30px] h-[30px] rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-2 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <TimelineView
      items={items}
      filterCategories={filterCategories}
      maxVisible={15}
      showTimestamps
      emptyMessage={t('cri.timeline.empty', 'No interactions found for this candidate.')}
      className={className}
    />
  );
}
