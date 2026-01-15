import { motion } from 'framer-motion';
import {
  Unlock, Trophy, Gavel, Plus, CheckCircle2, XCircle,
  Clock, AlertTriangle, CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useMilestoneHistory } from '@/hooks/useMilestoneHistory';

interface HistoricalTimelineProps {
  className?: string;
  limit?: number;
}

const eventConfig = {
  unlock: {
    icon: Unlock,
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
    label: 'Milestone Unlocked',
  },
  proposal: {
    icon: Plus,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    label: 'Proposal Created',
  },
  decision: {
    icon: Gavel,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    label: 'Decision Made',
  },
  reward: {
    icon: Trophy,
    color: 'text-premium',
    bg: 'bg-premium/10',
    border: 'border-premium/30',
    label: 'Reward Distributed',
  },
};

const decisionStatusConfig = {
  approved: { icon: CheckCircle2, color: 'text-success', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-destructive', label: 'Rejected' },
  deferred: { icon: Clock, color: 'text-warning', label: 'Deferred' },
  modified: { icon: AlertTriangle, color: 'text-primary', label: 'Modified' },
};

export function HistoricalTimeline({ className, limit = 50 }: HistoricalTimelineProps) {
  const { data: events = [], isLoading } = useMilestoneHistory(limit);
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card variant="elevated" className={cn('p-6', className)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card variant="static" className={cn('p-6 text-center', className)}>
        <div className="space-y-3 py-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
            <CalendarDays className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-heading-sm font-medium">No events yet</p>
          <p className="text-body-sm text-muted-foreground">
            Your milestone history will appear here once milestones are unlocked.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className={cn('p-6', className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-heading-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            Activity Timeline
          </h3>
          <Badge variant="outline">{events.length} events</Badge>
        </div>

        {/* Timeline */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

            {/* Events */}
            <div className="space-y-6">
              {events.map((event, index) => {
                const config = eventConfig[event.type];
                const EventIcon = config.icon;
                const decisionConfig =
                  event.type === 'decision' && event.metadata?.status
                    ? decisionStatusConfig[event.metadata.status as keyof typeof decisionStatusConfig]
                    : null;

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative flex gap-4"
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2',
                        config.bg,
                        config.border
                      )}
                    >
                      <EventIcon className={cn('h-5 w-5', config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-1.5 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-label-sm font-medium', config.color)}>
                          {config.label}
                        </span>
                        <span className="text-label-xs text-muted-foreground">
                          {formatDate(event.timestamp)}
                        </span>
                        {decisionConfig && (
                          <Badge
                            variant="outline"
                            className={cn('gap-1 text-label-xs', decisionConfig.color)}
                          >
                            <decisionConfig.icon className="h-3 w-3" />
                            {decisionConfig.label}
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-label-md font-semibold">{event.title}</h4>
                      {event.description && (
                        <p className="text-body-sm text-muted-foreground">
                          {event.description}
                        </p>
                      )}
                      {event.metadata?.amount && (
                        <p className="text-label-sm font-medium text-premium">
                          {formatCurrency(event.metadata.amount)}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}
