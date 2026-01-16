import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InvestorMetrics {
  id: string;
  snapshot_date: string;
  snapshot_type: string;
  arr: number;
  mrr: number;
  revenue_ytd: number;
  revenue_growth_mom: number | null;
  revenue_growth_yoy: number | null;
  total_customers: number;
  active_customers: number;
  new_customers_mtd: number;
  churned_customers_mtd: number;
  cac: number | null;
  ltv: number | null;
  ltv_cac_ratio: number | null;
  payback_months: number | null;
  gross_retention: number | null;
  net_revenue_retention: number | null;
  logo_retention: number | null;
  pipeline_value: number;
  weighted_pipeline: number;
  deal_count: number;
  avg_deal_size: number | null;
  total_users: number;
  active_users_mau: number;
  total_candidates: number;
  total_applications: number;
  total_placements: number;
  placement_rate: number | null;
  avg_time_to_hire_days: number | null;
  nps_score: number | null;
  csat_score: number | null;
  created_at: string;
}

export function useLatestInvestorMetrics() {
  return useQuery({
    queryKey: ['investor-metrics', 'latest'],
    queryFn: async (): Promise<InvestorMetrics | null> => {
      const { data, error } = await supabase
        .from('investor_metrics_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as InvestorMetrics | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvestorMetricsHistory(days: number = 90) {
  return useQuery({
    queryKey: ['investor-metrics', 'history', days],
    queryFn: async (): Promise<InvestorMetrics[]> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('investor_metrics_snapshots')
        .select('*')
        .gte('snapshot_date', startDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (error) throw error;
      return (data || []) as InvestorMetrics[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCaptureInvestorSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (snapshotType: string = 'daily') => {
      const { data, error } = await supabase.rpc('capture_investor_metrics_snapshot', {
        p_snapshot_type: snapshotType,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investor-metrics'] });
    },
  });
}

// Computed metrics for valuation
export function useValuationMetrics() {
  const { data: latest } = useLatestInvestorMetrics();
  const { data: history } = useInvestorMetricsHistory(365);

  const calculateGrowthRate = (current: number, previous: number) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const previousMonth = history?.find((m) => {
    const date = new Date(m.snapshot_date);
    const now = new Date();
    return (
      date.getMonth() === (now.getMonth() - 1 + 12) % 12 &&
      (date.getMonth() === 11 ? date.getFullYear() === now.getFullYear() - 1 : date.getFullYear() === now.getFullYear())
    );
  });

  const previousYear = history?.find((m) => {
    const date = new Date(m.snapshot_date);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() - 1 && date.getMonth() === now.getMonth();
  });

  return {
    arr: latest?.arr || 0,
    mrr: latest?.mrr || 0,
    revenueYTD: latest?.revenue_ytd || 0,
    growthMoM: previousMonth ? calculateGrowthRate(latest?.revenue_ytd || 0, previousMonth.revenue_ytd) : null,
    growthYoY: previousYear ? calculateGrowthRate(latest?.revenue_ytd || 0, previousYear.revenue_ytd) : null,
    totalCustomers: latest?.total_customers || 0,
    activeCustomers: latest?.active_customers || 0,
    ltv: latest?.ltv,
    cac: latest?.cac,
    ltvCacRatio: latest?.ltv_cac_ratio,
    nrr: latest?.net_revenue_retention,
    pipelineValue: latest?.pipeline_value || 0,
    weightedPipeline: latest?.weighted_pipeline || 0,
    totalPlacements: latest?.total_placements || 0,
    placementRate: latest?.placement_rate,
    // Rule of 40 = Growth Rate + Profit Margin (simplified as growth + 20% assumed margin)
    ruleOf40: previousYear
      ? (calculateGrowthRate(latest?.revenue_ytd || 0, previousYear.revenue_ytd) || 0) + 20
      : null,
    // Valuation multiples (typical SaaS)
    valuationAt5xARR: (latest?.arr || 0) * 5,
    valuationAt10xARR: (latest?.arr || 0) * 10,
    valuationAt15xARR: (latest?.arr || 0) * 15,
  };
}

// Simplified useInvestorMetrics hook for RevenueDashboard
interface InvestorMetricsSummary {
  total_revenue: number;
  revenue_growth: number;
  active_customers: number;
  total_candidates: number;
  total_placements: number;
  placement_revenue: number;
  net_revenue_retention: number;
}

export function useInvestorMetrics() {
  return useQuery<InvestorMetricsSummary>({
    queryKey: ['investor-metrics-summary'],
    queryFn: async (): Promise<InvestorMetricsSummary> => {
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;

      // Fetch invoices for revenue
      const invoicesRes = await supabase
        .from('moneybird_sales_invoices')
        .select('total_amount, state_normalized')
        .gte('invoice_date', startOfYear);

      let totalRevenue = 0;
      if (invoicesRes.data) {
        for (const inv of invoicesRes.data) {
          totalRevenue += Number(inv.total_amount) || 0;
        }
      }

      // Fetch companies for customer count  
      // Fetch companies for customer count
      const companiesRes = await supabase
        .from('companies')
        .select('id')
        .eq('status', 'active');

      // Fetch candidates
      const candidatesRes = await supabase
        .from('candidate_profiles')
        .select('id');

      // Fetch placements
      const placementsRes = await supabase
        .from('applications')
        .select('id')
        .eq('status', 'hired');

      return {
        total_revenue: totalRevenue,
        revenue_growth: 0,
        active_customers: companiesRes.data?.length || 0,
        total_candidates: candidatesRes.data?.length || 0,
        total_placements: placementsRes.data?.length || 0,
        placement_revenue: totalRevenue,
        net_revenue_retention: 100,
      };
    },
    staleTime: 60000,
  });
}

export function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `€${(value / 1000).toFixed(0)}k`;
  }
  return `€${value.toFixed(0)}`;
}
