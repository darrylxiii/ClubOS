/**
 * Enhanced ML Matching Hook
 * 
 * Integrates assessment scores, interview performance, and meeting intelligence
 * into the ML matching pipeline for more accurate candidate scoring.
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MLPrediction } from '@/types/ml';

interface EnhancedMatchingOptions {
  jobId: string;
  candidateIds?: string[];
  limit?: number;
  includeAssessments?: boolean;
  includeMeetingIntelligence?: boolean;
  includeEngagementMetrics?: boolean;
}

interface EnhancedPrediction extends MLPrediction {
  assessment_boost: number;
  interview_performance_score: number | null;
  engagement_score: number;
  combined_score: number;
}

export function useEnhancedMLMatching() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const matchCandidates = async (
    options: EnhancedMatchingOptions
  ): Promise<EnhancedPrediction[] | null> => {
    setLoading(true);
    setError(null);

    try {
      // Get base ML predictions
      const { data: mlData, error: mlError } = await supabase.functions.invoke(
        'ml-match-candidates',
        {
          body: {
            job_id: options.jobId,
            candidate_ids: options.candidateIds,
            limit: options.limit || 50,
          },
        }
      );

      if (mlError) throw mlError;
      
      const basePredictions: MLPrediction[] = mlData.predictions || [];
      
      if (basePredictions.length === 0) {
        return [];
      }

      // Get candidate IDs from predictions
      const candidateIds = basePredictions.map(p => p.candidate_id);

      // Fetch enhancement data in parallel
      const [
        assessmentData,
        meetingIntelligenceData,
        engagementData
      ] = await Promise.all([
        options.includeAssessments !== false 
          ? fetchAssessmentScores(candidateIds) 
          : Promise.resolve({}),
        options.includeMeetingIntelligence !== false 
          ? fetchMeetingIntelligence(candidateIds) 
          : Promise.resolve({}),
        options.includeEngagementMetrics !== false 
          ? fetchEngagementMetrics(candidateIds) 
          : Promise.resolve({})
      ]);

      // Enhance predictions with additional signals
      const enhancedPredictions: EnhancedPrediction[] = basePredictions.map(prediction => {
        const assessmentScore = (assessmentData as Record<string, number>)[prediction.candidate_id] || 0;
        const interviewScore = (meetingIntelligenceData as Record<string, number | null>)[prediction.candidate_id] ?? null;
        const engagementScore = (engagementData as Record<string, number>)[prediction.candidate_id] || 0.5;

        // Calculate assessment boost (up to 15% increase)
        const assessmentBoost = assessmentScore * 0.15;

        // Calculate interview performance modifier (if available)
        const interviewModifier = interviewScore !== null 
          ? (interviewScore - 0.5) * 0.2 // -10% to +10%
          : 0;

        // Calculate engagement modifier (up to 5%)
        const engagementModifier = (engagementScore - 0.5) * 0.1;

        // Combined score with enhancements
        const combinedScore = Math.min(1, Math.max(0,
          prediction.prediction_score + 
          assessmentBoost + 
          interviewModifier + 
          engagementModifier
        ));

        return {
          ...prediction,
          assessment_boost: assessmentBoost,
          interview_performance_score: interviewScore,
          engagement_score: engagementScore,
          combined_score: combinedScore,
        };
      });

      // Re-sort by combined score
      enhancedPredictions.sort((a, b) => b.combined_score - a.combined_score);
      
      // Update rank positions
      enhancedPredictions.forEach((pred, idx) => {
        pred.rank_position = idx + 1;
      });

      return enhancedPredictions;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Enhanced matching failed');
      setError(error);
      console.error('Error in enhanced matching:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { matchCandidates, loading, error };
}

// Fetch assessment scores for candidates
async function fetchAssessmentScores(
  candidateIds: string[]
): Promise<Record<string, number>> {
  try {
    // Get assessment results joined with candidate profiles
    const { data: assessmentResults, error } = await supabase
      .from('assessment_results')
      .select('user_id, score, assessment_type, is_latest')
      .eq('is_latest', true)
      .not('score', 'is', null);

    if (error) throw error;

    // Get user_ids for candidates
    const { data: candidateProfiles } = await supabase
      .from('candidate_profiles')
      .select('id, user_id')
      .in('id', candidateIds);

    if (!candidateProfiles) return {};

    const userIdToCandidateId = new Map(
      candidateProfiles.map(cp => [cp.user_id, cp.id])
    );

    // Calculate normalized scores per candidate
    const scoreMap: Record<string, number[]> = {};

    assessmentResults?.forEach(result => {
      const candidateId = userIdToCandidateId.get(result.user_id);
      if (candidateId && candidateIds.includes(candidateId)) {
        if (!scoreMap[candidateId]) {
          scoreMap[candidateId] = [];
        }
        // Normalize score to 0-1 range
        const normalizedScore = (result.score || 0) / 100;
        scoreMap[candidateId].push(normalizedScore);
      }
    });

    // Average scores per candidate
    const averages: Record<string, number> = {};
    Object.entries(scoreMap).forEach(([candidateId, scores]) => {
      averages[candidateId] = scores.reduce((a, b) => a + b, 0) / scores.length;
    });

    return averages;
  } catch (error) {
    console.error('Error fetching assessment scores:', error);
    return {};
  }
}

// Fetch meeting intelligence scores
async function fetchMeetingIntelligence(
  candidateIds: string[]
): Promise<Record<string, number | null>> {
  try {
    // Use type assertion for tables not in generated types
    const { data: meetingAnalysis, error } = await (supabase as any)
      .from('meeting_recording_analysis')
      .select(`
        id,
        ai_analysis,
        meetings!inner(candidate_id)
      `)
      .not('ai_analysis', 'is', null);

    if (error) throw error;

    const scores: Record<string, number[]> = {};

    meetingAnalysis?.forEach((analysis: any) => {
      const candidateId = analysis.meetings?.candidate_id;
      if (candidateId && candidateIds.includes(candidateId)) {
        const aiAnalysis = analysis.ai_analysis as any;
        
        // Extract performance score from AI analysis
        const performanceScore = 
          aiAnalysis?.candidate_evaluation?.overall_score ||
          aiAnalysis?.overall_impression?.score ||
          null;

        if (performanceScore !== null) {
          if (!scores[candidateId]) {
            scores[candidateId] = [];
          }
          scores[candidateId].push(performanceScore / 100);
        }
      }
    });

    // Average interview performance per candidate
    const averages: Record<string, number | null> = {};
    candidateIds.forEach(id => {
      if (scores[id] && scores[id].length > 0) {
        averages[id] = scores[id].reduce((a, b) => a + b, 0) / scores[id].length;
      } else {
        averages[id] = null;
      }
    });

    return averages;
  } catch (error) {
    console.error('Error fetching meeting intelligence:', error);
    return {};
  }
}

// Fetch engagement metrics
async function fetchEngagementMetrics(
  candidateIds: string[]
): Promise<Record<string, number>> {
  try {
    const { data: trackingData, error } = await supabase
      .from('user_activity_tracking')
      .select('user_id, activity_level, last_activity_at')
      .in('user_id', candidateIds);

    if (error) throw error;

    const scores: Record<string, number> = {};

    // Get candidate profiles to map user_id to candidate_id
    const { data: profiles } = await supabase
      .from('candidate_profiles')
      .select('id, user_id')
      .in('id', candidateIds);

    const userIdToCandidateId = new Map(
      profiles?.map(p => [p.user_id, p.id]) || []
    );

    trackingData?.forEach(tracking => {
      const candidateId = userIdToCandidateId.get(tracking.user_id);
      if (candidateId) {
        // Map activity level to score
        const levelScores: Record<string, number> = {
          'highly_active': 1.0,
          'active': 0.8,
          'moderate': 0.6,
          'low': 0.4,
          'inactive': 0.2,
        };
        scores[candidateId] = levelScores[tracking.activity_level] || 0.5;
      }
    });

    return scores;
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    return {};
  }
}
