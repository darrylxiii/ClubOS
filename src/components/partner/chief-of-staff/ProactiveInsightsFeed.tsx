import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { TimelineView, ConfidenceBadge } from '@/components/partner/shared';
import type { TimelineItem } from '@/components/partner/shared';
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Target,
  Trophy,
} from 'lucide-react';
import type { ProactiveInsight, InsightCategory } from '@/hooks/useAIChiefOfStaff';

// ── Config ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  InsightCategory,
  { icon: typeof Lightbulb; iconColor: string; label: string }
> = {
  opportunity: { icon: TrendingUp, iconColor: 'text-emerald-500', label: 'Opportunity' },
  risk: { icon: AlertTriangle, iconColor: 'text-rose-500', label: 'Risk' },
  recommendation: { icon: Target, iconColor: 'text-sky-500', label: 'Recommendation' },
  milestone: { icon: Trophy, iconColor: 'text-amber-500', label: 'Milestone' },
};

// ── Props ──────────────────────────────────────────────────────────

interface ProactiveInsightsFeedProps {
  insights: ProactiveInsight[];
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────

export function ProactiveInsightsFeed({ insights, className }: ProactiveInsightsFeedProps) {
  const { t } = useTranslation('partner');

  const filterCategories = useMemo(
    () => [
      { value: 'opportunity', label: t('chiefOfStaff.insights.opportunity', 'Opportunity') },
      { value: 'risk', label: t('chiefOfStaff.insights.risk', 'Risk') },
      { value: 'recommendation', label: t('chiefOfStaff.insights.recommendation', 'Recommendation') },
      { value: 'milestone', label: t('chiefOfStaff.insights.milestone', 'Milestone') },
    ],
    [t],
  );

  const timelineItems: TimelineItem[] = useMemo(
    () =>
      insights.map((insight) => {
        const config = CATEGORY_CONFIG[insight.category];
        return {
          id: insight.id,
          timestamp: insight.timestamp,
          title: insight.title,
          description: insight.description,
          category: insight.category,
          icon: config.icon,
          iconColor: config.iconColor,
          badge: config.label,
          badgeVariant: insight.category === 'risk' ? 'destructive' as const : 'secondary' as const,
          metadata: {
            ...(insight.confidence > 0
              ? { Confidence: `${insight.confidence}%` }
              : {}),
            ...(insight.actionLabel ? { Action: insight.actionLabel } : {}),
          },
        };
      }),
    [insights],
  );

  return (
    <div className={cn('glass-card p-6 rounded-xl', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">
          {t('chiefOfStaff.insights.title', 'Proactive Insights')}
        </h3>
      </div>

      <TimelineView
        items={timelineItems}
        filterCategories={filterCategories}
        maxVisible={8}
        showTimestamps
        emptyMessage={t(
          'chiefOfStaff.insights.empty',
          'No insights yet. Intelligence data will generate insights as your pipeline grows.',
        )}
      />
    </div>
  );
}
