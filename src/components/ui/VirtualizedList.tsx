import { useRef, ReactNode, CSSProperties } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  estimateSize?: number;
  overscan?: number;
  className?: string;
  itemClassName?: string;
  gap?: number;
  emptyMessage?: ReactNode;
}

/**
 * Generic virtualized list component for rendering large lists efficiently
 * Uses @tanstack/react-virtual under the hood
 */
export function VirtualizedList<T>({
  items,
  renderItem,
  estimateSize = 72,
  overscan = 5,
  className,
  itemClassName,
  gap = 0,
  emptyMessage = 'No items found',
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize + gap,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index];
          const style: CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualRow.size - gap}px`,
            transform: `translateY(${virtualRow.start}px)`,
          };

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={style}
              className={itemClassName}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Virtualized list with card-style items
 */
export function VirtualizedCardList<T>({
  items,
  renderItem,
  estimateSize = 120,
  className,
  ...props
}: VirtualizedListProps<T>) {
  return (
    <VirtualizedList
      items={items}
      renderItem={renderItem}
      estimateSize={estimateSize}
      className={cn('max-h-[600px]', className)}
      gap={12}
      {...props}
    />
  );
}
