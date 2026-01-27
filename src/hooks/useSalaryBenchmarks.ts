/**
 * Salary Benchmarks Hook
 * 
 * Dedicated hook for fetching and managing salary benchmark data.
 * Implements proper experience range filtering and data quality tracking.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SalaryBenchmark {
  id: string;
  role_title: string;
  location: string;
  experience_years: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  sample_size: number | null;
  updated_at: string | null;
  source: string | null;
  confidence_score: number | null;
}

interface AggregatedBenchmark {
  min: number;
  max: number;
  median: number;
  p25: number;
  p75: number;
  sampleSize: number;
  avgConfidence: number;
  lastUpdated: string | null;
  currency: string;
  sources: {
    platform: number;
    seed: number;
    external: number;
  };
}

interface UseSalaryBenchmarksResult {
  benchmarks: SalaryBenchmark[];
  aggregated: AggregatedBenchmark | null;
  loading: boolean;
  error: Error | null;
  hasData: boolean;
  availableRoles: string[];
  availableLocations: string[];
  fetchBenchmarks: (role: string, location: string, experience: number) => Promise<void>;
  fetchFilterOptions: () => Promise<void>;
}

export function useSalaryBenchmarks(): UseSalaryBenchmarksResult {
  const [benchmarks, setBenchmarks] = useState<SalaryBenchmark[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedBenchmark | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  const fetchFilterOptions = useCallback(async () => {
    try {
      // Fetch distinct roles
      const { data: rolesData } = await supabase
        .from('salary_benchmarks')
        .select('role_title')
        .order('role_title');
      
      // Fetch distinct locations
      const { data: locationsData } = await supabase
        .from('salary_benchmarks')
        .select('location')
        .order('location');

      if (rolesData) {
        const uniqueRoles = [...new Set(rolesData.map(r => r.role_title))];
        setAvailableRoles(uniqueRoles);
      }

      if (locationsData) {
        const uniqueLocations = [...new Set(locationsData.map(l => l.location))];
        setAvailableLocations(uniqueLocations);
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  }, []);

  const fetchBenchmarks = useCallback(async (
    role: string,
    location: string,
    experience: number
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Use RPC to filter by experience range using the @> (contains) operator
      // Since experience_years is an int4range, we need to check if the experience value is contained
      const { data, error: queryError } = await supabase
        .from('salary_benchmarks')
        .select('*')
        .eq('role_title', role)
        .eq('location', location);

      if (queryError) throw queryError;

      // Filter by experience range on the client side since int4range filtering is complex
      // The experience_years column contains ranges like "[0,2)", "[2,5)", etc.
      const filteredData = (data || []).filter(benchmark => {
        if (!benchmark.experience_years) return true;
        
        // Parse the int4range format: "[0,2)" -> [0, 2)
        const rangeStr = String(benchmark.experience_years);
        const match = rangeStr.match(/[\[\(](\d+),(\d+)[\]\)]/);
        
        if (!match) return true;
        
        const lower = parseInt(match[1], 10);
        const upper = parseInt(match[2], 10);
        const isLowerInclusive = rangeStr.startsWith('[');
        const isUpperInclusive = rangeStr.endsWith(']');
        
        // Check if experience is within the range
        const lowerCheck = isLowerInclusive ? experience >= lower : experience > lower;
        const upperCheck = isUpperInclusive ? experience <= upper : experience < upper;
        
        return lowerCheck && upperCheck;
      });

      setBenchmarks(filteredData as SalaryBenchmark[]);

      // Aggregate the filtered data
      if (filteredData.length > 0) {
        const validBenchmarks = filteredData.filter(
          b => b.salary_min !== null && b.salary_max !== null
        );

        if (validBenchmarks.length > 0) {
          const allMins = validBenchmarks.map(b => b.salary_min!);
          const allMaxs = validBenchmarks.map(b => b.salary_max!);
          const allSamples = validBenchmarks.map(b => b.sample_size || 0);
          const allConfidences = validBenchmarks.map(b => b.confidence_score || 0.5);

          // Weight by sample size for accuracy
          const totalSampleSize = allSamples.reduce((a, b) => a + b, 0);
          
          const weightedMin = allMins.reduce((sum, min, i) => 
            sum + min * (allSamples[i] / totalSampleSize), 0
          );
          const weightedMax = allMaxs.reduce((sum, max, i) => 
            sum + max * (allSamples[i] / totalSampleSize), 0
          );

          // Calculate percentiles
          const sortedMins = [...allMins].sort((a, b) => a - b);
          const sortedMaxs = [...allMaxs].sort((a, b) => a - b);
          
          const p25Index = Math.floor(sortedMins.length * 0.25);
          const medianIndex = Math.floor(sortedMins.length * 0.5);
          const p75Index = Math.floor(sortedMaxs.length * 0.75);

          // Count sources
          const sources = {
            platform: validBenchmarks.filter(b => b.source === 'platform').length,
            seed: validBenchmarks.filter(b => b.source === 'seed' || !b.source).length,
            external: validBenchmarks.filter(b => b.source === 'external').length
          };

          // Get most recent update
          const dates = validBenchmarks
            .map(b => b.updated_at)
            .filter(Boolean)
            .map(d => new Date(d!).getTime());
          const lastUpdated = dates.length > 0 
            ? new Date(Math.max(...dates)).toISOString() 
            : null;

          setAggregated({
            min: Math.round(weightedMin),
            max: Math.round(weightedMax),
            median: Math.round((sortedMins[medianIndex] + sortedMaxs[medianIndex]) / 2),
            p25: sortedMins[p25Index] || sortedMins[0],
            p75: sortedMaxs[p75Index] || sortedMaxs[sortedMaxs.length - 1],
            sampleSize: totalSampleSize,
            avgConfidence: allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length,
            lastUpdated,
            currency: validBenchmarks[0].currency || 'EUR',
            sources
          });
        } else {
          setAggregated(null);
        }
      } else {
        setAggregated(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch benchmarks');
      setError(error);
      console.error('Error fetching salary benchmarks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  return {
    benchmarks,
    aggregated,
    loading,
    error,
    hasData: benchmarks.length > 0 && aggregated !== null,
    availableRoles,
    availableLocations,
    fetchBenchmarks,
    fetchFilterOptions
  };
}
