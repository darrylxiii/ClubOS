import { useState, useEffect, useCallback } from 'react';

interface FilterState {
  [key: string]: string | number | boolean | null | undefined | object;
}

export function usePersistedFilters<T extends FilterState>(
  storageKey: string,
  defaultFilters: T
): [T, (filters: Partial<T>) => void, () => void] {
  const [filters, setFiltersState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultFilters, ...parsed };
      }
    } catch (err) {
      console.warn('Failed to load persisted filters:', err);
    }
    return defaultFilters;
  });

  // Persist to localStorage whenever filters change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch (err) {
      console.warn('Failed to persist filters:', err);
    }
  }, [storageKey, filters]);

  const setFilters = useCallback((newFilters: Partial<T>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {
      console.warn('Failed to clear persisted filters:', err);
    }
  }, [defaultFilters, storageKey]);

  return [filters, setFilters, clearFilters];
}

// Sort state persistence
interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

export function usePersistedSort(
  storageKey: string,
  defaultSort: SortState
): [SortState, (field: string) => void, (state: SortState) => void] {
  const [sort, setSortState] = useState<SortState>(() => {
    try {
      const stored = localStorage.getItem(`${storageKey}_sort`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.warn('Failed to load persisted sort:', err);
    }
    return defaultSort;
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_sort`, JSON.stringify(sort));
    } catch (err) {
      console.warn('Failed to persist sort:', err);
    }
  }, [storageKey, sort]);

  const toggleSort = useCallback((field: string) => {
    setSortState(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  return [sort, toggleSort, setSortState];
}
