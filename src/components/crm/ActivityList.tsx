import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Inbox,
  Plus,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useCRMActivities } from '@/hooks/useCRMActivities';
import { ActivityItem } from './ActivityItem';
import { ActivityQuickAdd } from './ActivityQuickAdd';

interface ActivityListProps {
  prospectId?: string;
  showProspect?: boolean;
  maxHeight?: string;
  className?: string;
}

type FilterType = 'all' | 'due_today' | 'overdue' | 'upcoming' | 'done';

export function ActivityList({ prospectId, showProspect = true, maxHeight = '400px', className }: ActivityListProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  // Fetch activities with infinite scroll support
  const {
    activities,
    loading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useCRMActivities({
    prospectId,
    limit: 20,
    // Pass precise filters to the hook
    dueToday: filter === 'due_today',
    overdue: filter === 'overdue',
    upcoming: filter === 'upcoming',
    done: filter === 'done' ? true : filter === 'all' ? undefined : false,
  });

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? activities.length + 1 : activities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  // Infinite Scroll Trigger
  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;

    if (
      lastItem.index >= activities.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    activities.length,
    isFetchingNextPage,
    rowVirtualizer.getVirtualItems(),
  ]);

  const filters: { key: FilterType; label: string; icon: React.ReactNode; color?: string }[] = [
    { key: 'all', label: 'All', icon: <Inbox className="w-4 h-4" /> },
    { key: 'due_today', label: 'Today', icon: <Clock className="w-4 h-4" />, color: 'text-yellow-400' },
    { key: 'overdue', label: 'Overdue', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400' },
    { key: 'upcoming', label: 'Upcoming', icon: <Calendar className="w-4 h-4" /> },
    { key: 'done', label: 'Done', icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {filters.map(({ key, label, icon, color }) => (
            <Button
              key={key}
              variant={filter === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(key)}
              className={cn(
                'gap-1.5 shrink-0',
                filter !== key && color
              )}
            >
              {icon}
              {label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Refresh activities">
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </Button>
          <ActivityQuickAdd
            prospectId={prospectId}
            onSuccess={refetch}
            trigger={
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            }
          />
        </div>
      </div>

      {/* Activity List */}
      <ScrollArea viewportRef={parentRef} style={{ maxHeight }} className="pr-2">
        {loading && activities.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border/30">
                <Skeleton className="w-5 h-5 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
              {filter === 'done' ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : filter === 'overdue' ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : (
                <Inbox className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <h3 className="font-semibold mb-1">
              {filter === 'done'
                ? 'No completed activities'
                : filter === 'overdue'
                  ? 'All caught up!'
                  : 'No activities'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {filter === 'overdue'
                ? 'You have no overdue activities'
                : 'Schedule your first activity to get started'}
            </p>
          </motion.div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const isLoaderRow = virtualItem.index > activities.length - 1;
              const activity = activities[virtualItem.index];

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div style={{ paddingBottom: '8px' }}>
                    {isLoaderRow ? (
                      <div className="flex justify-center p-4">
                        {isFetchingNextPage ? (
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        ) : hasNextPage ? (
                          <span className="text-xs text-muted-foreground">Load more</span>
                        ) : null}
                      </div>
                    ) : (
                      <ActivityItem
                        activity={activity}
                        showProspect={showProspect}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
