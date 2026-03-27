import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CandidateData } from '@/pages/InterviewComparison';

export function useCandidateComparison(applicationIds: string[], enabled: boolean) {
  return useQuery({
    queryKey: ['candidate-comparison', ...applicationIds],
    enabled: enabled && applicationIds.length >= 2,
    queryFn: async (): Promise<CandidateData[]> => {
      // Fetch applications with candidate profiles
      const { data: apps, error: appsError } = await supabase
        .from('applications')
        .select('id, match_score, match_factors, candidate_id, user_id, applied_at, candidate_profiles(full_name, email, avatar_url)')
        .in('id', applicationIds);

      if (appsError) throw appsError;

      // Fetch scorecards for these applications
      const { data: scorecards } = await (supabase as any)
        .from('candidate_scorecards')
        .select('application_id, overall_score, technical_score, communication_score, culture_fit_score, recommendation, strengths, concerns')
        .in('application_id', applicationIds);

      const scorecardMap = new Map<string, any>();
      for (const sc of (scorecards || [])) {
        const existing = scorecardMap.get(sc.application_id);
        if (!existing || (sc.overall_score || 0) > (existing.overall_score || 0)) {
          scorecardMap.set(sc.application_id, sc);
        }
      }

      return (apps || []).map((app: any): CandidateData => {
        const profile = app.candidate_profiles;
        const sc = scorecardMap.get(app.id);
        const factors = (app.match_factors || {}) as Record<string, any>;

        // Try scorecard first, fall back to match_factors
        const technical = sc?.technical_score || factors.technical_match || factors.skill_match || 0;
        const communication = sc?.communication_score || factors.communication_match || 0;
        const cultureFit = sc?.culture_fit_score || factors.culture_fit || factors.culture_match || 0;
        const overall = sc?.overall_score || app.match_score || 0;

        const strengths: string[] = sc?.strengths
          ? (Array.isArray(sc.strengths) ? sc.strengths : [])
          : Object.entries(factors)
              .filter(([, v]) => typeof v === 'number' && v >= 70)
              .slice(0, 3)
              .map(([k]) => k.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()));

        const concerns: string[] = sc?.concerns
          ? (Array.isArray(sc.concerns) ? sc.concerns : [])
          : Object.entries(factors)
              .filter(([, v]) => typeof v === 'number' && v < 50)
              .slice(0, 3)
              .map(([k]) => k.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()));

        return {
          id: app.id,
          name: profile?.full_name || 'Candidate',
          email: profile?.email || '',
          avatar_url: profile?.avatar_url || undefined,
          scores: {
            technical,
            communication,
            problemSolving: factors.problem_solving || 0,
            cultureFit,
            leadership: factors.leadership || 0,
            experience: factors.experience_match || factors.experience || 0,
          },
          overallScore: overall,
          strengths,
          concerns,
          interviewDate: app.applied_at || '',
          recommendation: sc?.recommendation,
          interviewCount: 0,
        };
      });
    },
  });
}
