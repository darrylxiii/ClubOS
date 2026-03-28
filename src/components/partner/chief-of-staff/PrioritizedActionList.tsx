import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from '@/lib/motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Users,
  DollarSign,
  Zap,
  Calendar,
  Send,
  Check,
  ChevronRight,
} from 'lucide-react';
import type { PrioritizedAction, ActionType, ActionUrgency } from '@/hooks/useAIChiefOfStaff';

// ── Config ─────────────────────────────────────────────────────────

const ACTION_ICONS: Record<ActionType, typeof Users> = {
  review_candidates: Users,
  adjust_offer: DollarSign,
  accelerate_pipeline: Zap,
  schedule_meeting: Calendar,
  send_outreach: Send,
};

const URGENCY_CONFIG: Record<ActionUrgency, { label: string; className: string }> = {
  critical: {
    label: 'Critical',
    className: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
  },
  high: {
    label: 'High',
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  },
  medium: {
    label: 'Medium',
    className: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  },
};

// ── Props ──────────────────────────────────────────────────────────

interface PrioritizedActionListProps {
  actions: PrioritizedAction[];
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────

export function PrioritizedActionList({ actions, className }: PrioritizedActionListProps) {
  const { t } = useTranslation('partner');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleActions = actions.filter((a) => !dismissedIds.has(a.id));

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  if (visibleActions.length === 0) {
    return (
      <div className={cn('glass-card p-6 rounded-xl', className)}>
        <h3 className="text-sm font-semibold mb-4">
          {t('chiefOfStaff.actions.title', 'Prioritized Actions')}
        </h3>
        <div className="text-center py-8 text-sm text-muted-foreground">
          {t('chiefOfStaff.actions.empty', 'No pending actions -- you are all caught up!')}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('glass-card p-6 rounded-xl', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">
          {t('chiefOfStaff.actions.title', 'Prioritized Actions')}
        </h3>
        <Badge variant="outline" className="text-[10px]">
          {visibleActions.length} {t('chiefOfStaff.actions.pending', 'pending')}
        </Badge>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {visibleActions.map((action, index) => {
            const Icon = ACTION_ICONS[action.type] || Users;
            const urgency = URGENCY_CONFIG[action.urgency];

            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  'group relative flex items-start gap-3 p-3 rounded-lg',
                  'bg-card/30 backdrop-blur border border-border/20',
                  'hover:border-primary/20 transition-colors duration-200',
                )}
              >
                {/* Number */}
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                  {index + 1}
                </div>

                {/* Icon */}
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                    action.urgency === 'critical'
                      ? 'bg-rose-500/10 text-rose-500'
                      : action.urgency === 'high'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-sky-500/10 text-sky-500',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium truncate">{action.title}</p>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] py-0 px-1.5 shrink-0', urgency.className)}
                    >
                      {t(`chiefOfStaff.urgency.${action.urgency}`, urgency.label)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {action.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => handleDismiss(action.id)}
                    title={t('chiefOfStaff.actions.markDone', 'Mark as done')}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-primary"
                  >
                    {t('chiefOfStaff.actions.takeAction', 'Action')}
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
