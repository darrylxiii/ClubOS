import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'financial-dashboard-year';

export function useFinancialYearSelector() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : currentYear;
  });

  // Fetch available years with data
  const { data: availableYears, isLoading: yearsLoading } = useQuery({
    queryKey: ['financial-years-available'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moneybird_financial_metrics')
        .select('period_start, total_revenue')
        .order('period_start', { ascending: false });

      if (error) throw error;

      // Extract unique years that have data
      const yearsWithData = new Map<number, number>();
      data?.forEach(row => {
        const year = parseInt(row.period_start.split('-')[0], 10);
        const existing = yearsWithData.get(year) || 0;
        yearsWithData.set(year, existing + (row.total_revenue || 0));
      });

      return Array.from(yearsWithData.entries())
        .sort((a, b) => b[0] - a[0]) // Sort descending by year
        .map(([year, revenue]) => ({ year, hasRevenue: revenue > 0 }));
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Find the best default year (most recent with revenue, or current year)
  const bestDefaultYear = availableYears?.find(y => y.hasRevenue)?.year || currentYear;

  // Auto-switch to best year if current selection has no data
  useEffect(() => {
    if (!yearsLoading && availableYears) {
      const currentSelection = availableYears.find(y => y.year === selectedYear);
      // If selected year has no data and there's a better option, suggest it
      if (!currentSelection?.hasRevenue && bestDefaultYear !== selectedYear) {
        // Only auto-switch on initial load, not after user selection
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          setSelectedYear(bestDefaultYear);
        }
      }
    }
  }, [availableYears, yearsLoading, bestDefaultYear, selectedYear]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    localStorage.setItem(STORAGE_KEY, year.toString());
  };

  // Generate list of years for the selector (last 5 years + current)
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return {
    selectedYear,
    setSelectedYear: handleYearChange,
    yearOptions,
    availableYears,
    yearsLoading,
    bestDefaultYear,
    isCurrentYearEmpty: availableYears?.find(y => y.year === selectedYear)?.hasRevenue === false,
  };
}
