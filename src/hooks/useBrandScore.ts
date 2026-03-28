import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BrandScoreData {
  brandScore: number;
  acceptanceRate: number;
  sentimentAvg: number;
  applicationTrend: 'up' | 'down' | 'neutral';
  applicationTrendPct: number;
  isLoading: boolean;
}

const DEFAULTS: Omit<BrandScoreData, 'isLoading'> = {
  brandScore: 0,
  acceptanceRate: 0,
  sentimentAvg: 0,
  applicationTrend: 'neutral',
  applicationTrendPct: 0,
};

/**
 * Calculates a composite employer brand score (0-100) from:
 *  - Offer acceptance rate (weight 40%)
 *  - Average scorecard sentiment (weight 30%)
 *  - Application volume trend (weight 30%)
 */
export function useBrandScore(companyId: string | undefined) {
  const query = useQuery({
    queryKey: ['brand-score', companyId],
    queryFn: async (): Promise<Omit<BrandScoreData, 'isLoading'>> => {
      if (!companyId) return DEFAULTS;

      try {
        // ── 1. Offer acceptance rate ──────────────────────────
        let acceptanceRate = 0;
        try {
          // Get all applications for this company's jobs that reached offer stage
          const { data: jobs } = await supabase
            .from('jobs')
            .select('id')
            .eq('company_id', companyId);

          const jobIds = (jobs || []).map(j => j.id);

          if (jobIds.length > 0) {
            const { data: offerApps } = await (supabase as any)
              .from('applications')
              .select('id, status, current_stage')
              .in('job_id', jobIds)
              .or('current_stage.ilike.%offer%,status.eq.offer_extended,status.eq.offer_accepted,status.eq.hired');

            const offers = offerApps || [];
            if (offers.length > 0) {
              const accepted = offers.filter(
                (a: any) => a.status === 'offer_accepted' || a.status === 'hired'
              ).length;
              acceptanceRate = Math.round((accepted / offers.length) * 100);
            }
          }
        } catch {
          // Table or column may not exist yet
        }

        // ── 2. Average scorecard sentiment ───────────────────
        let sentimentAvg = 0;
        try {
          const { data: scorecards } = await (supabase as any)
            .from('candidate_scorecards')
            .select('overall_rating, cultural_fit_score, communication_score')
            .not('overall_rating', 'is', null);

          if (scorecards && scorecards.length > 0) {
            // Normalize: overall_rating is typically 1-5
            const total = scorecards.reduce((sum: number, sc: any) => {
              const rating = sc.overall_rating || 0;
              const culture = sc.cultural_fit_score || rating;
              const comms = sc.communication_score || rating;
              return sum + (rating + culture + comms) / 3;
            }, 0);
            // Convert from 1-5 scale to 0-100
            sentimentAvg = Math.round((total / scorecards.length / 5) * 100);
          }
        } catch {
          // Table may not exist
        }

        // ── 3. Application volume trend ──────────────────────
        let applicationTrend: 'up' | 'down' | 'neutral' = 'neutral';
        let applicationTrendPct = 0;
        try {
          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

          const { data: jobs } = await supabase
            .from('jobs')
            .select('id')
            .eq('company_id', companyId);

          const jobIds = (jobs || []).map(j => j.id);

          if (jobIds.length > 0) {
            const { count: recentCount } = await supabase
              .from('applications')
              .select('id', { count: 'exact', head: true })
              .in('job_id', jobIds)
              .gte('applied_at', thirtyDaysAgo.toISOString());

            const { count: previousCount } = await supabase
              .from('applications')
              .select('id', { count: 'exact', head: true })
              .in('job_id', jobIds)
              .gte('applied_at', sixtyDaysAgo.toISOString())
              .lt('applied_at', thirtyDaysAgo.toISOString());

            const recent = recentCount || 0;
            const previous = previousCount || 0;

            if (previous > 0) {
              applicationTrendPct = Math.round(((recent - previous) / previous) * 100);
              applicationTrend = applicationTrendPct > 5 ? 'up' : applicationTrendPct < -5 ? 'down' : 'neutral';
            } else if (recent > 0) {
              applicationTrend = 'up';
              applicationTrendPct = 100;
            }
          }
        } catch {
          // Fail gracefully
        }

        // ── Composite score ──────────────────────────────────
        // Weighted: acceptance 40%, sentiment 30%, trend 30%
        const trendScore = applicationTrend === 'up'
          ? Math.min(100, 60 + applicationTrendPct)
          : applicationTrend === 'down'
            ? Math.max(0, 40 + applicationTrendPct)
            : 50;

        const brandScore = Math.round(
          acceptanceRate * 0.4 +
          sentimentAvg * 0.3 +
          trendScore * 0.3
        );

        return {
          brandScore: Math.min(100, Math.max(0, brandScore)),
          acceptanceRate,
          sentimentAvg,
          applicationTrend,
          applicationTrendPct,
        };
      } catch {
        return DEFAULTS;
      }
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  return {
    ...(query.data || DEFAULTS),
    isLoading: query.isLoading,
  };
}
