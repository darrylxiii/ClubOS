import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MLPrediction } from '@/types/ml';
import { useSemanticSearch } from './useSemanticSearch';

interface UseMLMatchingOptions {
  jobId: string;
  candidateIds?: string[];
  limit?: number;
  useSemanticSearch?: boolean; // Enable semantic search enhancement
}

export function useMLMatching() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { search: semanticSearch } = useSemanticSearch();

  const matchCandidates = async (
    options: UseMLMatchingOptions
  ): Promise<MLPrediction[] | null> => {
    setLoading(true);
    setError(null);

    try {
      // If semantic search is enabled, fetch job description and enhance matching
      let semanticCandidateIds = options.candidateIds;
      
      if (options.useSemanticSearch) {
        // Fetch job details
        const { data: job } = await supabase
          .from('jobs')
          .select('title, description, requirements')
          .eq('id', options.jobId)
          .single();

        if (job) {
          // Use semantic search to find relevant candidates
          const jobText = `${job.title} ${job.description} ${job.requirements || ''}`;
          const semanticResults = await semanticSearch({
            entity_type: 'candidate',
            query: jobText,
            limit: options.limit || 50,
            threshold: 0.6,
          });

          if (semanticResults && semanticResults.length > 0) {
            // Combine with provided candidate IDs if any
            const semanticIds = semanticResults.map(r => r.id);
            semanticCandidateIds = options.candidateIds 
              ? [...new Set([...options.candidateIds, ...semanticIds])]
              : semanticIds;
          }
        }
      }

      const { data, error: functionError } = await supabase.functions.invoke(
        'ml-match-candidates',
        {
          body: {
            job_id: options.jobId,
            candidate_ids: semanticCandidateIds,
            limit: options.limit || 50,
            use_semantic_boost: options.useSemanticSearch,
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
