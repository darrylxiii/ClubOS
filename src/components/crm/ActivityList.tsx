import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { useCRMActivities } from '@/hooks/useCRMActivities';
import { ActivityItem } from './ActivityItem';
import { ActivityQuickAdd } from './ActivityQuickAdd';
import type { CRMActivity } from '@/types/crm-activities';

interface ActivityListProps {
  prospectId?: string;
  showProspect?: boolean;
  maxHeight?: string;
  className?: string;
}

type FilterType = 'all' | 'due_today' | 'overdue' | 'upcoming' | 'done';

export function ActivityList({ prospectId, showProspect = true, maxHeight = '400px', className }: ActivityListProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  // Fetch activities based on filter
  const { activities: allActivities, loading: loadingAll, refetch } = useCRMActivities({ 
    prospectId,
    done: filter === 'done' ? true : filter === 'all' ? undefined : false,
  });

  // Filter locally for better UX
  const today = new Date().toISOString().split('T')[0];
  
  const filteredActivities = allActivities.filter(activity => {
    switch (filter) {
      case 'due_today':
        return activity.due_date === today && !activity.is_done;
      case 'overdue':
        return activity.due_date && activity.due_date < today && !activity.is_done;
      case 'upcoming':
        return activity.due_date && activity.due_date > today && !activity.is_done;
      case 'done':
        return activity.is_done;
      default:
        return true;
    }
  });

  // Calculate counts for badges
  const overdueCount = allActivities.filter(a => a.due_date && a.due_date < today && !a.is_done).length;
  const dueTodayCount = allActivities.filter(a => a.due_date === today && !a.is_done).length;

  const filters: { key: FilterType; label: string; icon: React.ReactNode; count?: number; color?: string }[] = [
    { key: 'all', label: 'All', icon: <Inbox className="w-4 h-4" /> },
    { key: 'due_today', label: 'Today', icon: <Clock className="w-4 h-4" />, count: dueTodayCount, color: 'text-yellow-400' },
    { key: 'overdue', label: 'Overdue', icon: <AlertTriangle className="w-4 h-4" />, count: overdueCount, color: 'text-red-400' },
    { key: 'upcoming', label: 'Upcoming', icon: <Calendar className="w-4 h-4" /> },
    { key: 'done', label: 'Done', icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {filters.map(({ key, label, icon, count, color }) => (
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
              {count !== undefined && count > 0 && (
                <span className={cn(
                  'ml-1 text-xs px-1.5 py-0.5 rounded-full',
                  filter === key ? 'bg-primary-foreground/20' : 'bg-muted'
                )}>
                  {count}
                </span>
              )}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={refetch} aria-label="Refresh activities">
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
      <ScrollArea style={{ maxHeight }} className="pr-2">
        {loadingAll ? (
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
        ) : filteredActivities.length === 0 ? (
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
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {filteredActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ActivityItem 
                    activity={activity} 
                    showProspect={showProspect}
                  />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </ScrollArea>
    </div>
  );
}
