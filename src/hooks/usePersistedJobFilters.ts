import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { JobFilterState, defaultJobFilters } from '@/types/jobFilters';

const STORAGE_KEY = 'admin_job_filters_v1';
const STORAGE_VERSION = 1;

interface StoredFilters {
  version: number;
  filters: JobFilterState;
}

export function usePersistedJobFilters() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize from URL or localStorage
  const [filters, setFilters] = useState<JobFilterState>(() => {
    // First try to read from URL
    const params = new URLSearchParams(location.search);
    const urlFilters = parseFiltersFromURL(params);
    
    if (urlFilters) {
      return urlFilters;
    }
    
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredFilters = JSON.parse(stored);
        if (parsed.version === STORAGE_VERSION) {
          return parsed.filters;
        }
      }
    } catch (error) {
      console.error('Failed to parse stored filters:', error);
    }
    
    return defaultJobFilters;
  });

  // Sync to localStorage whenever filters change
  useEffect(() => {
    try {
      const toStore: StoredFilters = {
        version: STORAGE_VERSION,
        filters,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error('Failed to store filters:', error);
    }
  }, [filters]);

  // Sync to URL whenever filters change (without reload)
  useEffect(() => {
    const params = encodeFiltersToURL(filters);
    const currentParams = location.search.slice(1);
    
    if (params !== currentParams) {
      navigate(`${location.pathname}?${params}`, { replace: true });
    }
  }, [filters, navigate, location.pathname]);

  // Listen for storage events (sync across tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed: StoredFilters = JSON.parse(e.newValue);
          if (parsed.version === STORAGE_VERSION) {
            setFilters(parsed.filters);
          }
        } catch (error) {
          console.error('Failed to sync filters from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateFilters = useCallback((updates: Partial<JobFilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultJobFilters);
  }, []);

  const hasActiveFilters = useCallback(() => {
    return (
      filters.search !== '' ||
      filters.status.length > 0 ||
      filters.companies.length > 0 ||
      filters.dateRange.from !== null ||
      filters.dateRange.to !== null ||
      filters.quickFilter !== 'all'
    );
  }, [filters]);

  return {
    filters,
    updateFilters,
    resetFilters,
    hasActiveFilters: hasActiveFilters(),
  };
}

// Helper: Parse filters from URL params
function parseFiltersFromURL(params: URLSearchParams): JobFilterState | null {
  try {
    const search = params.get('search') || '';
    const status = params.get('status')?.split(',').filter(Boolean) || [];
    const companies = params.get('companies')?.split(',').filter(Boolean) || [];
    const dateFrom = params.get('date_from');
    const dateTo = params.get('date_to');
    const quickFilter = (params.get('filter') as JobFilterState['quickFilter']) || 'all';

    // Only return parsed filters if at least one is present
    if (search || status.length > 0 || companies.length > 0 || dateFrom || dateTo || quickFilter !== 'all') {
      return {
        search,
        status,
        companies,
        dateRange: {
          from: dateFrom ? new Date(dateFrom) : null,
          to: dateTo ? new Date(dateTo) : null,
        },
        quickFilter,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to parse URL filters:', error);
    return null;
  }
}

// Helper: Encode filters to URL params
function encodeFiltersToURL(filters: JobFilterState): string {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set('search', filters.search);
  }
  
  if (filters.status.length > 0) {
    params.set('status', filters.status.join(','));
  }
  
  if (filters.companies.length > 0) {
    params.set('companies', filters.companies.join(','));
  }
  
  if (filters.dateRange.from) {
    params.set('date_from', filters.dateRange.from.toISOString().split('T')[0]);
  }
  
  if (filters.dateRange.to) {
    params.set('date_to', filters.dateRange.to.toISOString().split('T')[0]);
  }
  
  if (filters.quickFilter !== 'all') {
    params.set('filter', filters.quickFilter);
  }

  return params.toString();
}
