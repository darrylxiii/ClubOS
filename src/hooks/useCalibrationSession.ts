import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ── Types ────────────────────────────────────────────────────────
export interface VotingSession {
  id: string;
  application_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  /** Joined from applications → jobs */
  job_title?: string;
  candidate_name?: string;
}

export interface ReviewerCalibration {
  evaluator_id: string;
  evaluator_name: string;
  avatar_url?: string;
  avgScore: number;
  scoreCount: number;
  variance: number;
  /** Deviation from team mean (positive = harsher, negative = more lenient) */
  deviationPct: number;
}

export interface CalibrationData {
  teamAvgScore: number;
  teamScoreVariance: number;
  reviewers: ReviewerCalibration[];
  totalScorecards: number;
}

// ── Helpers ──────────────────────────────────────────────────────
function calcVariance(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const sumSqDiff = values.reduce((acc, v) => acc + (v - mean) ** 2, 0);
  return sumSqDiff / values.length;
}

// ── Hook ─────────────────────────────────────────────────────────
export function useCalibrationSession(companyId: string | null) {
  const queryClient = useQueryClient();

  // ── Active voting sessions ────────────────────────────────────
  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    isError: sessionsError,
  } = useQuery({
    queryKey: ['calibration-sessions', companyId],
    queryFn: async (): Promise<VotingSession[]> => {
      if (!companyId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from('scorecard_voting_sessions')
          .select('id, application_id, status, created_at, updated_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[useCalibrationSession] sessions query error:', error.message);
          return [];
        }

        if (!data || data.length === 0) return [];

        // Enrich with job + candidate info
        const applicationIds = [...new Set(data.map((s: any) => s.application_id))];
        const { data: apps } = await supabase
          .from('applications')
          .select('id, candidate_id, job_id')
          .in('id', applicationIds);

        const appMap: Record<string, any> = {};
        (apps || []).forEach((a: any) => { appMap[a.id] = a; });

        const jobIds = [...new Set((apps || []).map((a: any) => a.job_id).filter(Boolean))];
        const candidateIds = [...new Set((apps || []).map((a: any) => a.candidate_id).filter(Boolean))];

        const [jobsRes, candidatesRes] = await Promise.all([
          jobIds.length > 0
            ? supabase.from('jobs').select('id, title').in('id', jobIds)
            : Promise.resolve({ data: [] }),
          candidateIds.length > 0
            ? supabase.from('candidates').select('id, name').in('id', candidateIds)
            : Promise.resolve({ data: [] }),
        ]);

        const jobMap: Record<string, string> = {};
        (jobsRes.data || []).forEach((j: any) => { jobMap[j.id] = j.title; });
        const candMap: Record<string, string> = {};
        (candidatesRes.data || []).forEach((c: any) => { candMap[c.id] = c.name; });

        return data.map((s: any) => {
          const app = appMap[s.application_id];
          return {
            ...s,
            job_title: app ? jobMap[app.job_id] || 'Unknown Job' : 'Unknown Job',
            candidate_name: app ? candMap[app.candidate_id] || 'Unknown' : 'Unknown',
          };
        });
      } catch (err) {
        console.warn('[useCalibrationSession] sessions fetch failed:', err);
        return [];
      }
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  // ── Calibration analytics ─────────────────────────────────────
  const {
    data: calibrationData = null,
    isLoading: calibrationLoading,
  } = useQuery({
    queryKey: ['calibration-data', companyId],
    queryFn: async (): Promise<CalibrationData | null> => {
      if (!companyId) return null;
      try {
        // Fetch all scorecards for the company (via applications → jobs → company)
        const { data: scorecards, error } = await (supabase as any)
          .from('candidate_scorecards')
          .select('evaluator_id, overall_rating, application_id, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(500);

        // Fallback: if company_id column doesn't exist, try joining via applications
        let cards = scorecards;
        if (error || !cards) {
          const { data: fallback } = await (supabase as any)
            .from('candidate_scorecards')
            .select('evaluator_id, overall_rating, application_id, created_at')
            .order('created_at', { ascending: false })
            .limit(500);
          cards = fallback || [];
        }

        if (!cards || cards.length === 0) {
          return { teamAvgScore: 0, teamScoreVariance: 0, reviewers: [], totalScorecards: 0 };
        }

        // Aggregate per-reviewer
        const byReviewer: Record<string, number[]> = {};
        const allScores: number[] = [];

        cards.forEach((sc: any) => {
          const score = sc.overall_rating ?? 0;
          if (score === 0) return;
          allScores.push(score);
          if (!byReviewer[sc.evaluator_id]) byReviewer[sc.evaluator_id] = [];
          byReviewer[sc.evaluator_id].push(score);
        });

        const teamMean = allScores.length > 0
          ? allScores.reduce((a, b) => a + b, 0) / allScores.length
          : 0;
        const teamVar = calcVariance(allScores, teamMean);

        // Fetch reviewer profiles
        const reviewerIds = Object.keys(byReviewer);
        let profileMap: Record<string, any> = {};
        if (reviewerIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', reviewerIds);
          (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
        }

        const reviewers: ReviewerCalibration[] = reviewerIds.map(id => {
          const scores = byReviewer[id];
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          const variance = calcVariance(scores, avg);
          const deviationPct = teamMean > 0
            ? Math.round(((teamMean - avg) / teamMean) * 100)
            : 0;

          return {
            evaluator_id: id,
            evaluator_name: profileMap[id]?.full_name || 'Unknown Reviewer',
            avatar_url: profileMap[id]?.avatar_url,
            avgScore: Math.round(avg * 10) / 10,
            scoreCount: scores.length,
            variance: Math.round(variance * 100) / 100,
            deviationPct,
          };
        });

        // Sort by scoreCount desc so most active reviewers appear first
        reviewers.sort((a, b) => b.scoreCount - a.scoreCount);

        return {
          teamAvgScore: Math.round(teamMean * 10) / 10,
          teamScoreVariance: Math.round(teamVar * 100) / 100,
          reviewers,
          totalScorecards: allScores.length,
        };
      } catch (err) {
        console.warn('[useCalibrationSession] calibration fetch failed:', err);
        return null;
      }
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  // ── Mutations ─────────────────────────────────────────────────
  const startSession = useMutation({
    mutationFn: async (applicationId: string) => {
      const { data, error } = await (supabase as any)
        .from('scorecard_voting_sessions')
        .insert({
          application_id: applicationId,
          company_id: companyId,
          status: 'active',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calibration-sessions', companyId] });
    },
  });

  const endSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await (supabase as any)
        .from('scorecard_voting_sessions')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calibration-sessions', companyId] });
    },
  });

  return {
    sessions,
    calibrationData,
    isLoading: sessionsLoading || calibrationLoading,
    isError: sessionsError,
    startSession,
    endSession,
  };
}
