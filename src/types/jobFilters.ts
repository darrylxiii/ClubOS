export interface JobFilterState {
  search: string;
  status: string[];
  companies: string[];
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  quickFilter: 'all' | 'expiring-soon' | 'recent-activity' | 'high-engagement';
}

export const defaultJobFilters: JobFilterState = {
  search: '',
  status: [],
  companies: [],
  dateRange: {
    from: null,
    to: null,
  },
  quickFilter: 'all',
};
