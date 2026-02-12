import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AssessmentDimension {
  score: number;
  confidence: number;
  sources: string[];
  details?: string;
}

export interface AssessmentBreakdown {
  skills_match: AssessmentDimension;
  experience: AssessmentDimension;
  engagement: AssessmentDimension;
  culture_fit: AssessmentDimension;
  salary_match: AssessmentDimension;
  location_match: AssessmentDimension;
  overall_score: number;
  overall_confidence: number;
  computed_at: string;
  job_id?: string;
}

interface UseAssessmentScoresResult {
  breakdown: AssessmentBreakdown | null;
  isLoading: boolean;
  isComputing: boolean;
  error: string | null;
  recompute: () => Promise<void>;
}

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useAssessmentScores(
  candidateId: string | undefined,
  jobId?: string | null
): UseAssessmentScoresResult {
  const [breakdown, setBreakdown] = useState<AssessmentBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExisting = useCallback(async () => {
    if (!candidateId) return null;

    const { data } = await supabase
      .from('candidate_profiles')
      .select('assessment_breakdown, assessment_computed_at')
      .eq('id', candidateId)
      .single();

    if (!data) return null;

    const ab = data.assessment_breakdown as unknown as AssessmentBreakdown | null;
    const computedAt = data.assessment_computed_at;

    if (!ab || !computedAt) return null;

    // Check staleness
    const age = Date.now() - new Date(computedAt).getTime();
    if (age > STALE_THRESHOLD_MS) return null;

    // Check if job context changed
    if (jobId && ab.job_id !== jobId) return null;

    return ab;
  }, [candidateId, jobId]);

  const computeScores = useCallback(async () => {
    if (!candidateId) return;

    setIsComputing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'calculate-assessment-scores',
        { body: { candidate_id: candidateId, job_id: jobId || undefined } }
      );

      if (fnError) throw fnError;
      if (data?.breakdown) {
        setBreakdown(data.breakdown);
      }
    } catch (err: any) {
      console.error('Failed to compute assessment scores:', err);
      setError(err.message || 'Failed to compute scores');
    } finally {
      setIsComputing(false);
    }
  }, [candidateId, jobId]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!candidateId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const existing = await fetchExisting();
        if (!cancelled) {
          if (existing) {
            setBreakdown(existing);
            setIsLoading(false);
          } else {
            setIsLoading(false);
            // Auto-compute if stale or missing
            computeScores();
          }
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [candidateId, jobId, fetchExisting, computeScores]);

  return {
    breakdown,
    isLoading,
    isComputing,
    error,
    recompute: computeScores,
  };
}
