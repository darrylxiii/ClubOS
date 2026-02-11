import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AutoMatchResult {
  job_id: string;
  job_title: string;
  matches_found: number;
  matches: Array<{
    candidate_id: string;
    candidate_name: string;
    match_score: number;
    similarity_score: number;
    match_factors: string[];
  }>;
}

interface EnrichmentResult {
  processed: number;
  enriched: number;
  errors: number;
  results: Array<{
    id: string;
    success?: boolean;
    error?: string;
    tier?: string;
    move_probability?: number;
    embedding_generated?: boolean;
  }>;
}

export function useAutoMatchCandidates() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AutoMatchResult | null>(null);

  const matchCandidatesForJob = useCallback(async (
    jobId: string,
    options?: { limit?: number; threshold?: number }
  ): Promise<AutoMatchResult | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-match-candidates', {
        body: {
          job_id: jobId,
          limit: options?.limit || 25,
          threshold: options?.threshold || 0.5,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Match failed');

      setResult(data);
      toast.success(`QUIN found ${data.matches_found} potential matches for "${data.job_title}"`);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Auto-match failed';
      toast.error(msg);
      console.error('Auto-match error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { matchCandidatesForJob, loading, result };
}

export function useCandidateEnrichment() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const enrichCandidate = useCallback(async (candidateId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-candidate-profile', {
        body: { candidate_id: candidateId },
      });

      if (error) throw error;
      if (data?.enriched > 0) {
        toast.success('Profile enriched by QUIN');
        return true;
      }
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Enrichment failed';
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const enrichBatch = useCallback(async (candidateIds: string[]): Promise<EnrichmentResult | null> => {
    setLoading(true);
    setProgress({ current: 0, total: candidateIds.length });

    try {
      // Process in chunks of 5 to avoid timeouts
      const chunkSize = 5;
      let totalEnriched = 0;
      let totalErrors = 0;
      const allResults: EnrichmentResult['results'] = [];

      for (let i = 0; i < candidateIds.length; i += chunkSize) {
        const chunk = candidateIds.slice(i, i + chunkSize);
        setProgress({ current: i, total: candidateIds.length });

        const { data, error } = await supabase.functions.invoke('enrich-candidate-profile', {
          body: { batch_ids: chunk },
        });

        if (error) {
          totalErrors += chunk.length;
          continue;
        }

        totalEnriched += data?.enriched || 0;
        totalErrors += data?.errors || 0;
        allResults.push(...(data?.results || []));

        // Small delay between chunks
        if (i + chunkSize < candidateIds.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      setProgress({ current: candidateIds.length, total: candidateIds.length });

      const result: EnrichmentResult = {
        processed: candidateIds.length,
        enriched: totalEnriched,
        errors: totalErrors,
        results: allResults,
      };

      toast.success(`QUIN enriched ${totalEnriched} candidates (${totalErrors} errors)`);
      return result;
    } catch (err) {
      toast.error('Batch enrichment failed');
      return null;
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, []);

  return { enrichCandidate, enrichBatch, loading, progress };
}
