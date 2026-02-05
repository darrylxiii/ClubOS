import { useState, useCallback, useMemo } from 'react';
import type { CRMActivity } from '@/types/crm-activities';

interface UseActivitySelectionOptions {
  activities: CRMActivity[];
}

export interface ActivitySelectionState {
  selectedIds: Set<string>;
  isAllSelected: boolean;
  isPartialSelection: boolean;
  selectedCount: number;
}

export interface UseActivitySelectionReturn extends ActivitySelectionState {
  toggleActivity: (activityId: string) => void;
  toggleAll: () => void;
  clearSelection: () => void;
  selectActivities: (activityIds: string[]) => void;
  isSelected: (activityId: string) => boolean;
  getSelectedActivities: () => CRMActivity[];
}

/**
 * Hook for managing multi-select state for CRM activities
 * Supports select all, bulk operations, and individual toggles
 */
export function useActivitySelection({ activities }: UseActivitySelectionOptions): UseActivitySelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const activityIds = useMemo(() => activities.map(a => a.id), [activities]);

  const isAllSelected = useMemo(
    () => activityIds.length > 0 && selectedIds.size === activityIds.length,
    [activityIds.length, selectedIds.size]
  );

  const isPartialSelection = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < activityIds.length,
    [selectedIds.size, activityIds.length]
  );

  const toggleActivity = useCallback((activityId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(activityId)) {
        next.delete(activityId);
      } else {
        next.add(activityId);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === activityIds.length) {
        return new Set();
      } else {
        return new Set(activityIds);
      }
    });
  }, [activityIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectActivities = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const isSelected = useCallback(
    (activityId: string) => selectedIds.has(activityId),
    [selectedIds]
  );

  const getSelectedActivities = useCallback(
    () => activities.filter(a => selectedIds.has(a.id)),
    [activities, selectedIds]
  );

  return {
    selectedIds,
    isAllSelected,
    isPartialSelection,
    selectedCount: selectedIds.size,
    toggleActivity,
    toggleAll,
    clearSelection,
    selectActivities,
    isSelected,
    getSelectedActivities,
  };
}
