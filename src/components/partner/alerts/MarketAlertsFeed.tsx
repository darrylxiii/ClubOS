import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from '@/lib/motion';
import {
  Building2,
  TrendingDown,
  DollarSign,
  Mail,
  GitBranch,
  Bell,
  Sparkles,
} from 'lucide-react';
import { TimelineView, type TimelineItem } from '@/components/partner/shared/TimelineView';
import { CompetitorMovementCard } from './CompetitorMovementCard';
import { Button } from '@/components/ui/button';
import { X, Clock } from 'lucide-react';
import type { MarketAlert, AlertCategory } from '@/hooks/useMarketAlerts';
import type { LucideIcon } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────

const CATEGORY_META: Record<AlertCategory, { icon: LucideIcon; color: string; label: string }> = {
  competitor: { icon: Building2, color: 'text-amber-500', label: 'Competitor' },
  layoff: { icon: TrendingDown, color: 'text-rose-500', label: 'Layoff' },
  salary: { icon: DollarSign, color: 'text-emerald-500', label: 'Salary' },
  offer_activity: { icon: Mail, color: 'text-blue-500', label: 'Offer Activity' },
  pipeline: { icon: GitBranch, color: 'text-purple-500', label: 'Pipeline' },
};

const SEVERITY_BADGE: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  critical: 'destructive',
  warning: 'default',
  info: 'secondary',
  success: 'outline',
};

interface MarketAlertsFeedProps {
  alerts: MarketAlert[];
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
}

export function MarketAlertsFeed({ alerts, onDismiss, onSnooze }: MarketAlertsFeedProps) {
  const { t } = useTranslation('partner');

  // Competitor alerts get a special card; the rest use TimelineView
  const competitorAlerts = useMemo(
    () => alerts.filter(a => a.category === 'competitor'),
    [alerts],
  );

  const otherAlerts = useMemo(
    () => alerts.filter(a => a.category !== 'competitor'),
    [alerts],
  );

  const timelineItems: TimelineItem[] = useMemo(
    () =>
      otherAlerts.map(a => {
        const meta = CATEGORY_META[a.category] || CATEGORY_META.pipeline;
        return {
          id: a.id,
          timestamp: a.created_at,
          title: a.title,
          description: a.message,
          category: a.category,
          icon: meta.icon,
          iconColor: meta.color,
          badge: a.severity,
          badgeVariant: SEVERITY_BADGE[a.severity] || 'outline',
          metadata: a.metadata?.company
            ? { Company: a.metadata.company }
            : undefined,
        };
      }),
    [otherAlerts],
  );

  const filterCategories = useMemo(
    () => [
      { value: 'layoff', label: t('marketAlerts.categories.layoff', 'Layoff') },
      { value: 'salary', label: t('marketAlerts.categories.salary', 'Salary') },
      { value: 'offer_activity', label: t('marketAlerts.categories.offerActivity', 'Offer Activity') },
      { value: 'pipeline', label: t('marketAlerts.categories.pipeline', 'Pipeline') },
    ],
    [t],
  );

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-3 rounded-full bg-emerald-500/10 mb-4">
          <Sparkles className="h-8 w-8 text-emerald-500" />
        </div>
        <p className="text-lg font-medium text-emerald-600 dark:text-emerald-400">
          {t('marketAlerts.empty.title', 'No New Alerts')}
        </p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {t(
            'marketAlerts.empty.description',
            'You are all caught up. New market signals will appear here in real time.',
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Competitor movement cards (special rendering) */}
      {competitorAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-500" />
            {t('marketAlerts.categories.competitor', 'Competitor Movement')}
          </h3>
          <AnimatePresence mode="popLayout">
            {competitorAlerts.map(alert => (
              <CompetitorMovementCard
                key={alert.id}
                alert={alert}
                onDismiss={onDismiss}
                onSnooze={onSnooze}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Other alerts via TimelineView */}
      {otherAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            {t('marketAlerts.feed.otherAlerts', 'Market Signals')}
          </h3>
          <TimelineView
            items={timelineItems}
            filterCategories={filterCategories}
            maxVisible={15}
            emptyMessage={t('marketAlerts.empty.title', 'No New Alerts')}
          />
          {/* Inline dismiss/snooze actions rendered below the timeline */}
          <div className="space-y-1">
            {otherAlerts.map(a => (
              <div
                key={`actions-${a.id}`}
                className="flex items-center gap-2 text-xs text-muted-foreground pl-[42px]"
              >
                <span className="truncate max-w-[200px] font-medium">{a.title}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] gap-1 px-2"
                  onClick={() => onDismiss(a.id)}
                >
                  <X className="h-3 w-3" />
                  {t('marketAlerts.actions.dismiss', 'Dismiss')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] gap-1 px-2"
                  onClick={() => onSnooze(a.id)}
                >
                  <Clock className="h-3 w-3" />
                  {t('marketAlerts.actions.snooze', 'Snooze')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
