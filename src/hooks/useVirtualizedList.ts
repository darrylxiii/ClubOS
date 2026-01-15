import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface UseVirtualizedListOptions<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  getScrollElement?: () => HTMLElement | null;
}

/**
 * Reusable hook for virtualized list rendering
 * Wraps @tanstack/react-virtual with sensible defaults
 */
export function useVirtualizedList<T>({
  items,
  estimateSize = 72,
  overscan = 5,
  getScrollElement,
}: UseVirtualizedListOptions<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: getScrollElement || (() => parentRef.current),
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return {
    parentRef,
    virtualizer,
    virtualItems,
    totalSize,
    // Helper to get item by virtual row index
    getItem: useCallback((index: number) => items[index], [items]),
  };
}

/**
 * Reusable hook for virtualized table rows
 */
export function useVirtualizedTable<T>({
  items,
  estimateSize = 56,
  overscan = 10,
}: UseVirtualizedListOptions<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  return {
    parentRef,
    virtualizer,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    getItem: useCallback((index: number) => items[index], [items]),
  };
}
