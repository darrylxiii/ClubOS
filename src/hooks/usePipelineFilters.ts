import { useState, useCallback, useMemo } from "react";

export type SortField = 'name' | 'match_score' | 'days_in_stage' | 'applied_date';
export type SortDir = 'asc' | 'desc';
export type DaysRange = 'all' | 'lt7' | '7to14' | 'gt14';
export type RiskLevel = 'all' | 'none' | 'medium' | 'high';

export interface PipelineFilterState {
  matchScoreMin: number; // 0 = all, 60, 80
  sources: string[];
  daysRange: DaysRange;
  riskLevel: RiskLevel;
  sortBy: SortField;
  sortDir: SortDir;
}

const DEFAULT_FILTERS: PipelineFilterState = {
  matchScoreMin: 0,
  sources: [],
  daysRange: 'all',
  riskLevel: 'all',
  sortBy: 'applied_date',
  sortDir: 'desc',
};

function getDaysInStage(app: Record<string, unknown>): number {
  const appliedDate = new Date((app.updated_at as string) || (app.applied_at as string));
  return Math.floor((Date.now() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
}

function getRiskLevel(daysInStage: number, avgThreshold: number): 'none' | 'medium' | 'high' {
  if (daysInStage > avgThreshold * 2) return 'high';
  if (daysInStage > avgThreshold) return 'medium';
  return 'none';
}

export function usePipelineFilters() {
  const [filters, setFiltersState] = useState<PipelineFilterState>(DEFAULT_FILTERS);

  const setFilter = useCallback(<K extends keyof PipelineFilterState>(
    key: K,
    value: PipelineFilterState[K],
  ) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.matchScoreMin > 0) count++;
    if (filters.sources.length > 0) count++;
    if (filters.daysRange !== 'all') count++;
    if (filters.riskLevel !== 'all') count++;
    return count;
  }, [filters]);

  const isDefault = activeFilterCount === 0 && filters.sortBy === 'applied_date' && filters.sortDir === 'desc';

  const applyFilters = useCallback((
    apps: Record<string, unknown>[],
    avgDaysThreshold: number,
  ): Record<string, unknown>[] => {
    let filtered = apps;

    // Match score filter
    if (filters.matchScoreMin > 0) {
      filtered = filtered.filter((app) => {
        const score = (app.match_score as number) || 0;
        return score >= filters.matchScoreMin;
      });
    }

    // Source filter
    if (filters.sources.length > 0) {
      filtered = filtered.filter((app) => {
        const source = (app.application_source as string) || 'direct';
        return filters.sources.includes(source);
      });
    }

    // Days in stage filter
    if (filters.daysRange !== 'all') {
      filtered = filtered.filter((app) => {
        const days = getDaysInStage(app);
        if (filters.daysRange === 'lt7') return days < 7;
        if (filters.daysRange === '7to14') return days >= 7 && days <= 14;
        if (filters.daysRange === 'gt14') return days > 14;
        return true;
      });
    }

    // Risk level filter
    if (filters.riskLevel !== 'all') {
      filtered = filtered.filter((app) => {
        const days = getDaysInStage(app);
        const risk = getRiskLevel(days, avgDaysThreshold || 7);
        return risk === filters.riskLevel;
      });
    }

    return filtered;
  }, [filters]);

  const applySorting = useCallback((apps: Record<string, unknown>[]): Record<string, unknown>[] => {
    const sorted = [...apps];
    const dir = filters.sortDir === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name': {
          const nameA = ((a.full_name as string) || '').toLowerCase();
          const nameB = ((b.full_name as string) || '').toLowerCase();
          return nameA.localeCompare(nameB) * dir;
        }
        case 'match_score': {
          const scoreA = (a.match_score as number) || 0;
          const scoreB = (b.match_score as number) || 0;
          return (scoreA - scoreB) * dir;
        }
        case 'days_in_stage': {
          const daysA = getDaysInStage(a);
          const daysB = getDaysInStage(b);
          return (daysA - daysB) * dir;
        }
        case 'applied_date': {
          const dateA = new Date((a.applied_at as string) || (a.created_at as string)).getTime();
          const dateB = new Date((b.applied_at as string) || (b.created_at as string)).getTime();
          return (dateA - dateB) * dir;
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [filters.sortBy, filters.sortDir]);

  return {
    filters,
    setFilter,
    resetFilters,
    activeFilterCount,
    isDefault,
    applyFilters,
    applySorting,
  };
}
