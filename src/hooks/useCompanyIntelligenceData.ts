import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/contexts/RoleContext';

export interface CompanyIntelligence {
  /** Health scores */
  healthScore: number | null;
  responseTimeScore: number | null;
  pipelineVelocityScore: number | null;
  conversionRateScore: number | null;

  /** Benchmarks (anonymized partner network) */
  benchmarkTimeToFill: number | null;
  benchmarkOfferAcceptance: number | null;
  benchmarkCandidatesPerRole: number | null;

  /** Analytics snapshot (latest) */
  totalApplications: number;
  activeJobs: number;
  totalHires: number;
  avgTimeToHire: number | null;
  offerAcceptanceRate: number | null;

  /** Meta */
  lastUpdated: string | null;
}

const DEFAULTS: CompanyIntelligence = {
  healthScore: null,
  responseTimeScore: null,
  pipelineVelocityScore: null,
  conversionRateScore: null,
  benchmarkTimeToFill: null,
  benchmarkOfferAcceptance: null,
  benchmarkCandidatesPerRole: null,
  totalApplications: 0,
  activeJobs: 0,
  totalHires: 0,
  avgTimeToHire: null,
  offerAcceptanceRate: null,
  lastUpdated: null,
};

/**
 * Centralized intelligence aggregation hook.
 * Queries partner_health_scores, partner_benchmarks, and partner_analytics_snapshots
 * in parallel with a single cache key. Used by War Room, Briefing Deck, Predictive,
 * Brand, Network Intelligence, and AI Chief of Staff.
 */
export function useCompanyIntelligenceData() {
  const { companyId } = useRole();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['company-intelligence', companyId],
    queryFn: async (): Promise<CompanyIntelligence> => {
      if (!companyId) return DEFAULTS;

      try {
        const [healthRes, benchmarkRes, snapshotRes] = await Promise.all([
          // Latest health score
          (supabase as any)
            .from('partner_health_scores')
            .select('overall_score, response_time_score, pipeline_velocity_score, conversion_rate_score, calculated_at')
            .eq('company_id', companyId)
            .order('calculated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),

          // Latest benchmarks
          (supabase as any)
            .from('partner_benchmarks')
            .select('avg_time_to_fill, avg_offer_acceptance_rate, avg_candidates_per_role, calculated_at')
            .eq('company_id', companyId)
            .order('calculated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),

          // Latest analytics snapshot
          (supabase as any)
            .from('partner_analytics_snapshots')
            .select('metrics, snapshot_date')
            .eq('company_id', companyId)
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const health = healthRes.data;
        const benchmark = benchmarkRes.data;
        const snapshot = snapshotRes.data;
        const metrics = snapshot?.metrics || {};

        return {
          healthScore: health?.overall_score ?? null,
          responseTimeScore: health?.response_time_score ?? null,
          pipelineVelocityScore: health?.pipeline_velocity_score ?? null,
          conversionRateScore: health?.conversion_rate_score ?? null,

          benchmarkTimeToFill: benchmark?.avg_time_to_fill ?? null,
          benchmarkOfferAcceptance: benchmark?.avg_offer_acceptance_rate ?? null,
          benchmarkCandidatesPerRole: benchmark?.avg_candidates_per_role ?? null,

          totalApplications: metrics.total_applications ?? 0,
          activeJobs: metrics.active_jobs ?? 0,
          totalHires: metrics.total_hires ?? 0,
          avgTimeToHire: metrics.avg_time_to_hire ?? null,
          offerAcceptanceRate: metrics.offer_acceptance_rate ?? null,

          lastUpdated: health?.calculated_at || snapshot?.snapshot_date || null,
        };
      } catch {
        return DEFAULTS;
      }
    },
    enabled: !!companyId,
    staleTime: 300000, // 5 min -- intelligence data doesn't need aggressive refresh
  });

  return {
    data: data ?? DEFAULTS,
    isLoading,
    isError,
  };
}
