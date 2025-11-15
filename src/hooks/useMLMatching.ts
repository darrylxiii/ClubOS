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

  // DEPRECATED: backfillTrainingData removed in Phase B
  // Training data now comes from real-time interactions, not historical backfill
  // Using backfilled data would create synthetic/outdated training data that conflicts
  // with the real-time intelligence extraction system

  return {
    matchCandidates,
    loading,
    error,
  };
}
