/**
 * Salary Recommendation Hook
 * 
 * Fetches salary recommendations for candidate-job pairs,
 * integrating market benchmarks for offer optimization.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SalaryRecommendation {
  recommended_base_salary: number;
  recommended_bonus_percentage: number;
  recommended_equity_percentage: number;
  total_compensation: number;
  salary_percentile: number;
  market_competitiveness_score: number;
  currency: string;
  market_data: {
    min: number;
    max: number;
    median: number;
    sample_size: number;
  };
  candidate_expectations: {
    current_salary: number;
    expected_min: number;
    expected_max: number;
    years_experience: number;
  };
  ai_insights: {
    summary: string;
    risk_factors: string[];
    negotiation_tips: string[];
    counter_offer_preparation: string;
  };
}

export function useSalaryRecommendation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [recommendation, setRecommendation] = useState<SalaryRecommendation | null>(null);

  const getRecommendation = useCallback(async (
    candidateId: string,
    jobId: string,
    applicationId?: string
  ): Promise<SalaryRecommendation | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'generate-offer-recommendation',
        {
          body: {
            candidate_id: candidateId,
            job_id: jobId,
            application_id: applicationId,
          },
        }
      );

      if (fnError) throw fnError;

      setRecommendation(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get salary recommendation');
      setError(error);
      console.error('Error getting salary recommendation:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBenchmarks = useCallback(async (
    roleTitle: string,
    location?: string
  ) => {
    try {
      let query = supabase
        .from('salary_benchmarks')
        .select('*')
        .ilike('role_title', `%${roleTitle}%`);

      if (location) {
        query = query.ilike('location', `%${location}%`);
      }

      const { data, error } = await query.limit(10);

      if (error) throw error;

      return data;
    } catch (err) {
      console.error('Error fetching benchmarks:', err);
      return [];
    }
  }, []);

  const calculatePercentile = useCallback((
    salary: number,
    marketMin: number,
    marketMax: number
  ): number => {
    if (marketMax <= marketMin) return 50;
    const percentile = ((salary - marketMin) / (marketMax - marketMin)) * 100;
    return Math.max(0, Math.min(100, Math.round(percentile)));
  }, []);

  const getCompetitivenessLabel = useCallback((score: number): string => {
    if (score >= 80) return 'Highly Competitive';
    if (score >= 60) return 'Competitive';
    if (score >= 40) return 'Moderate';
    return 'Below Market';
  }, []);

  return {
    loading,
    error,
    recommendation,
    getRecommendation,
    getBenchmarks,
    calculatePercentile,
    getCompetitivenessLabel,
  };
}
