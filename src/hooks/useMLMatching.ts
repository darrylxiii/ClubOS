import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MLPrediction } from '@/types/ml';

interface UseMLMatchingOptions {
  jobId: string;
  candidateIds?: string[];
  limit?: number;
}

export function useMLMatching() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const matchCandidates = async (
    options: UseMLMatchingOptions
  ): Promise<MLPrediction[] | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'ml-match-candidates',
        {
          body: {
            job_id: options.jobId,
            candidate_ids: options.candidateIds,
            limit: options.limit || 50,
          },
        }
      );

      if (functionError) throw functionError;

      return data.predictions || [];
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to match candidates');
      setError(error);
      console.error('Error matching candidates:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const backfillTrainingData = async (daysBack = 180, limit = 1000) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'ml-backfill-training-data',
        {
          body: {
            days_back: daysBack,
            limit: limit,
          },
        }
      );

      if (functionError) throw functionError;

      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to backfill training data');
      setError(error);
      console.error('Error backfilling training data:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    matchCandidates,
    backfillTrainingData,
    loading,
    error,
  };
}
