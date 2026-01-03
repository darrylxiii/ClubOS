/**
 * Unified Table State Hook
 * Provides consistent sorting, filtering, and pagination across all table components
 */

import { useState, useCallback, useMemo } from 'react';

export interface SortConfig<TColumn extends string = string> {
  column: TColumn | null;
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  totalItems: number;
}

export interface TableStateOptions<TColumn extends string = string> {
  defaultSort?: SortConfig<TColumn>;
  defaultPageSize?: number;
  searchDebounceMs?: number;
}

export interface TableState<TColumn extends string = string> {
  // Sorting
  sort: SortConfig<TColumn>;
  setSort: (column: TColumn) => void;
  clearSort: () => void;
  
  // Filtering
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: Record<string, any>;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  
  // Pagination
  pagination: PaginationConfig;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number) => void;
  
  // Computed
  offset: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalPages: number;
}

export function useTableState<TColumn extends string = string>(
  options: TableStateOptions<TColumn> = {}
): TableState<TColumn> {
  const {
    defaultSort = { column: null, direction: 'asc' as const },
    defaultPageSize = 25,
  } = options;
  
  // Sorting state
  const [sort, setSortState] = useState<SortConfig<TColumn>>(defaultSort);
  
  // Search & filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationConfig>({
    page: 1,
    pageSize: defaultPageSize,
    totalItems: 0,
  });
  
  // Sort handlers
  const setSort = useCallback((column: TColumn) => {
    setSortState(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    // Reset to first page on sort change
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);
  
  const clearSort = useCallback(() => {
    setSortState(defaultSort);
  }, [defaultSort]);
  
  // Filter handlers
  const setFilter = useCallback((key: string, value: any) => {
    setFilters(prev => {
      if (value === null || value === undefined || value === '') {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
    // Reset to first page on filter change
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);
  
  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm('');
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);
  
  // Search handler (also resets page)
  const handleSetSearchTerm = useCallback((term: string) => {
    setSearchTerm(term);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);
  
  // Pagination handlers
  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page: Math.max(1, page) }));
  }, []);
  
  const setPageSize = useCallback((pageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);
  
  const setTotalItems = useCallback((totalItems: number) => {
    setPagination(prev => ({ ...prev, totalItems }));
  }, []);
  
  // Computed pagination values
  const computedValues = useMemo(() => {
    const { page, pageSize, totalItems } = pagination;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    
    return {
      offset: (page - 1) * pageSize,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      totalPages,
    };
  }, [pagination]);
  
  return {
    // Sorting
    sort,
    setSort,
    clearSort,
    
    // Filtering
    searchTerm,
    setSearchTerm: handleSetSearchTerm,
    filters,
    setFilter,
    clearFilters,
    
    // Pagination
    pagination,
    setPage,
    setPageSize,
    setTotalItems,
    
    // Computed
    ...computedValues,
  };
}

/**
 * Helper to apply table state to an array (client-side sorting/filtering)
 */
export function applyTableState<T, TColumn extends string>(
  data: T[],
  state: TableState<TColumn>,
  options: {
    sortFn?: (a: T, b: T, column: TColumn, direction: 'asc' | 'desc') => number;
    filterFn?: (item: T, searchTerm: string, filters: Record<string, any>) => boolean;
  } = {}
): T[] {
  let result = [...data];
  
  // Apply filters
  if (options.filterFn && (state.searchTerm || Object.keys(state.filters).length > 0)) {
    result = result.filter(item => 
      options.filterFn!(item, state.searchTerm, state.filters)
    );
  }
  
  // Apply sorting
  if (options.sortFn && state.sort.column) {
    result.sort((a, b) => 
      options.sortFn!(a, b, state.sort.column!, state.sort.direction)
    );
  }
  
  return result;
}

/**
 * Helper to paginate an array (client-side pagination)
 */
export function paginateArray<T>(
  data: T[],
  page: number,
  pageSize: number
): { items: T[]; totalItems: number } {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  return {
    items: data.slice(start, end),
    totalItems: data.length,
  };
}
