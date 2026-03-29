import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { motion, AnimatePresence } from '@/lib/motion';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';

export interface TimelineItem {
  id: string;
  /** Timestamp for ordering */
  timestamp: string;
  /** Display title */
  title: string;
  /** Optional description */
  description?: string;
  /** Category for filtering */
  category: string;
  /** Lucide icon */
  icon: LucideIcon;
  /** Icon color class */
  iconColor?: string;
  /** Optional badge text */
  badge?: string;
  /** Optional badge variant */
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
  /** Optional metadata key-value pairs */
  metadata?: Record<string, string>;
}

interface TimelineViewProps {
  items: TimelineItem[];
  /** Categories available for filtering */
  filterCategories?: { value: string; label: string }[];
  /** Maximum items to show before "Show more" */
  maxVisible?: number;
  /** Show relative timestamps */
  showTimestamps?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  className?: string;
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function TimelineView({
  items,
  filterCategories,
  maxVisible = 10,
  showTimestamps = true,
  emptyMessage,
  className,
}: TimelineViewProps) {
  const { t } = useTranslation('common');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const filteredItems = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (!activeFilter) return sorted;
    return sorted.filter(item => item.category === activeFilter);
  }, [items, activeFilter]);

  const visibleItems = showAll ? filteredItems : filteredItems.slice(0, maxVisible);
  const hasMore = filteredItems.length > maxVisible && !showAll;

  if (items.length === 0) {
    return (
      <div className={cn('text-center py-8 text-sm text-muted-foreground', className)}>
        {emptyMessage || t('timelineSection.empty', 'No activity yet')}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Filter bar */}
      {filterCategories && filterCategories.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Button
            variant={activeFilter === null ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActiveFilter(null)}
          >
            {t('timelineSection.all', 'All')}
          </Button>
          {filterCategories.map(cat => (
            <Button
              key={cat.value}
              variant={activeFilter === cat.value ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveFilter(activeFilter === cat.value ? null : cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/50" />

        <AnimatePresence mode="popLayout">
          {visibleItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
                className="relative flex gap-3 pb-4 last:pb-0"
              >
                {/* Dot / icon */}
                <div className={cn(
                  'relative z-10 flex items-center justify-center w-[30px] h-[30px] rounded-full shrink-0',
                  'bg-card border border-border/50',
                  item.iconColor || 'text-muted-foreground'
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <Badge variant={item.badgeVariant || 'outline'} className="text-[10px]">
                          {item.badge}
                        </Badge>
                      )}
                      {showTimestamps && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  {item.metadata && Object.keys(item.metadata).length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {Object.entries(item.metadata).map(([key, val]) => (
                        <span key={key} className="text-[10px] text-muted-foreground">
                          <span className="font-medium">{key}:</span> {val}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Show more */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={() => setShowAll(true)}
        >
          {t('timelineSection.showMore', 'Show {{count}} more', { count: filteredItems.length - maxVisible })}
        </Button>
      )}
    </div>
  );
}
