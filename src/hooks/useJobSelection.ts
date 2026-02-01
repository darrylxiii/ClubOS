import { useState, useCallback, useMemo } from 'react';

interface UseJobSelectionOptions {
  jobs: { id: string }[];
}

export interface JobSelectionState {
  selectedIds: Set<string>;
  isAllSelected: boolean;
  isPartialSelection: boolean;
  selectedCount: number;
}

export interface UseJobSelectionReturn extends JobSelectionState {
  toggleJob: (jobId: string) => void;
  toggleAll: () => void;
  clearSelection: () => void;
  selectJobs: (jobIds: string[]) => void;
  isSelected: (jobId: string) => boolean;
}

/**
 * Hook for managing multi-select state for jobs
 * Supports shift-click ranges, select all, and bulk operations
 */
export function useJobSelection({ jobs }: UseJobSelectionOptions): UseJobSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const jobIds = useMemo(() => jobs.map(j => j.id), [jobs]);

  const isAllSelected = useMemo(
    () => jobIds.length > 0 && selectedIds.size === jobIds.length,
    [jobIds.length, selectedIds.size]
  );

  const isPartialSelection = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < jobIds.length,
    [selectedIds.size, jobIds.length]
  );

  const toggleJob = useCallback((jobId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === jobIds.length) {
        // Deselect all
        return new Set();
      } else {
        // Select all
        return new Set(jobIds);
      }
    });
  }, [jobIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectJobs = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const isSelected = useCallback(
    (jobId: string) => selectedIds.has(jobId),
    [selectedIds]
  );

  return {
    selectedIds,
    isAllSelected,
    isPartialSelection,
    selectedCount: selectedIds.size,
    toggleJob,
    toggleAll,
    clearSelection,
    selectJobs,
    isSelected,
  };
}
