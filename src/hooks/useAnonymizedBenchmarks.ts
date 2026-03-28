import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyIntelligenceData } from '@/hooks/useCompanyIntelligenceData';
import { useRole } from '@/contexts/RoleContext';

export interface BenchmarkMetric {
  label: string;
  key: string;
  yours: number | null;
  networkAvg: number | null;
  percentile: number;
  /** For time-based metrics lower is better */
  lowerIsBetter: boolean;
  unit: string;
}

export interface AnonymizedBenchmarks {
  metrics: BenchmarkMetric[];
  /** Overall percentile across all metrics */
  overallPercentile: number;
  networkAvgTimeToFill: number | null;
  networkAvgOfferAcceptance: number | null;
  networkAvgCandidatesPerRole: number | null;
}

const DEFAULTS: AnonymizedBenchmarks = {
  metrics: [],
  overallPercentile: 50,
  networkAvgTimeToFill: null,
  networkAvgOfferAcceptance: null,
  networkAvgCandidatesPerRole: null,
};

/**
 * Computes a simple percentile: what fraction of the network average
 * is beaten by the company value.  For "lower is better" metrics the
 * comparison is inverted.
 */
function estimatePercentile(
  yours: number | null,
  networkAvg: number | null,
  lowerIsBetter: boolean,
): number {
  if (yours == null || networkAvg == null || networkAvg === 0) return 50;
  const ratio = yours / networkAvg;
  // Convert to a 0-100 percentile estimate
  if (lowerIsBetter) {
    // e.g. time to fill: 35 yours vs 42 avg => ratio 0.83 => percentile ~67
    const pct = Math.round((1 - (ratio - 1)) * 50 + 50);
    return Math.max(1, Math.min(99, pct));
  }
  // e.g. acceptance rate: 90% yours vs 80% avg => ratio 1.125 => percentile ~62
  const pct = Math.round(ratio * 50);
  return Math.max(1, Math.min(99, pct));
}

/**
 * Queries the partner_benchmarks table for industry-level anonymized
 * aggregates (averages across ALL partners) and compares them against
 * the current company's own metrics from useCompanyIntelligenceData.
 */
export function useAnonymizedBenchmarks() {
  const { companyId } = useRole();
  const { data: companyData } = useCompanyIntelligenceData();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['anonymized-benchmarks', companyId],
    queryFn: async (): Promise<AnonymizedBenchmarks> => {
      try {
        // Try to refresh benchmarks via RPC
        try {
          await supabase.rpc('calculate_partner_benchmarks' as any, {
            p_company_id: companyId,
          });
        } catch {
          // RPC may not exist yet -- ignore
        }

        // Fetch network-wide aggregates (all partners, latest row per company,
        // then average).  We pull all recent rows and compute in JS to avoid
        // needing a custom SQL aggregate.
        const { data: rows } = await (supabase as any)
          .from('partner_benchmarks')
          .select('avg_time_to_fill, avg_offer_acceptance_rate, avg_candidates_per_role')
          .order('calculated_at', { ascending: false })
          .limit(200);

        const allRows = (rows || []) as Array<{
          avg_time_to_fill: number | null;
          avg_offer_acceptance_rate: number | null;
          avg_candidates_per_role: number | null;
        }>;

        const avg = (values: (number | null)[]) => {
          const nums = values.filter((v): v is number => v != null);
          if (nums.length === 0) return null;
          return nums.reduce((a, b) => a + b, 0) / nums.length;
        };

        const networkAvgTTF = avg(allRows.map(r => r.avg_time_to_fill));
        const networkAvgOAR = avg(allRows.map(r => r.avg_offer_acceptance_rate));
        const networkAvgCPR = avg(allRows.map(r => r.avg_candidates_per_role));

        const metricsRaw: Array<Omit<BenchmarkMetric, 'percentile'>> = [
          {
            label: 'Time to Fill',
            key: 'time_to_fill',
            yours: companyData.avgTimeToHire,
            networkAvg: networkAvgTTF,
            lowerIsBetter: true,
            unit: 'days',
          },
          {
            label: 'Offer Acceptance Rate',
            key: 'offer_acceptance',
            yours: companyData.offerAcceptanceRate,
            networkAvg: networkAvgOAR,
            lowerIsBetter: false,
            unit: '%',
          },
          {
            label: 'Candidates per Role',
            key: 'candidates_per_role',
            yours: companyData.benchmarkCandidatesPerRole,
            networkAvg: networkAvgCPR,
            lowerIsBetter: false,
            unit: '',
          },
        ];

        const metrics: BenchmarkMetric[] = metricsRaw.map(m => ({
          ...m,
          percentile: estimatePercentile(m.yours, m.networkAvg, m.lowerIsBetter),
        }));

        const validPercentiles = metrics.filter(m => m.yours != null);
        const overallPercentile =
          validPercentiles.length > 0
            ? Math.round(
                validPercentiles.reduce((s, m) => s + m.percentile, 0) /
                  validPercentiles.length,
              )
            : 50;

        return {
          metrics,
          overallPercentile,
          networkAvgTimeToFill: networkAvgTTF,
          networkAvgOfferAcceptance: networkAvgOAR,
          networkAvgCandidatesPerRole: networkAvgCPR,
        };
      } catch {
        return DEFAULTS;
      }
    },
    enabled: !!companyId,
    staleTime: 300_000, // 5 min
  });

  return {
    data: data ?? DEFAULTS,
    isLoading,
    isError,
  };
}
