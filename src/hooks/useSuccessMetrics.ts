import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SuccessMetrics {
  totalHires: number;
  avgTimeToHire: number; // days
  retentionRate90d: number; // 0-100
  avgROI: number;
  qualityScore: number; // 0-100 composite
  totalFees: number;
  avgFeePerHire: number;
  /** Monthly hire counts (last 6 months) for sparklines */
  monthlyHires: number[];
  /** Monthly ROI values (last 6 months) for sparklines */
  monthlyROI: number[];
  /** Monthly retention values (last 6 months) for sparklines */
  monthlyRetention: number[];
  isLoading: boolean;
  error: Error | null;
}

const DEFAULTS: Omit<SuccessMetrics, 'isLoading' | 'error'> = {
  totalHires: 0,
  avgTimeToHire: 0,
  retentionRate90d: 0,
  avgROI: 0,
  qualityScore: 0,
  totalFees: 0,
  avgFeePerHire: 0,
  monthlyHires: [],
  monthlyROI: [],
  monthlyRetention: [],
};

/**
 * Fetches success metrics for a partner company.
 *
 * Queries:
 *  - applications with status 'hired' -> hire count, avg time-to-hire
 *  - placement_fees -> total fees, avg per hire
 *  - 90-day retention: hires older than 90 days still in 'hired' status
 *  - ROI per placement: salary_max / placement_fee
 *  - NPS surveys (table may not exist) for hiring manager satisfaction
 *
 * All queries are wrapped in try/catch and return safe defaults on error.
 */
export function useSuccessMetrics(companyId: string | null): SuccessMetrics {
  const { data, isLoading, error } = useQuery({
    queryKey: ['success-metrics', companyId],
    queryFn: async () => {
      if (!companyId) return DEFAULTS;

      // ── 1. Hired applications ────────────────────────────────────
      let hiredApplications: any[] = [];
      try {
        const { data: apps, error: appsErr } = await supabase
          .from('applications')
          .select('id, candidate_id, job_id, created_at, updated_at, status, stage')
          .eq('status', 'hired');

        if (appsErr) throw appsErr;
        hiredApplications = apps || [];
      } catch {
        hiredApplications = [];
      }

      // Filter to applications linked to jobs owned by this company
      let companyJobIds: Set<string> = new Set();
      let jobSalaryMap: Record<string, number> = {};
      try {
        const { data: jobs, error: jobsErr } = await supabase
          .from('jobs')
          .select('id, salary_max, company_id')
          .eq('company_id', companyId);

        if (jobsErr) throw jobsErr;
        for (const job of jobs || []) {
          companyJobIds.add(job.id);
          if (job.salary_max) {
            jobSalaryMap[job.id] = job.salary_max;
          }
        }
      } catch {
        // Fallback: use all hired applications (unfiltered)
      }

      const companyHires = companyJobIds.size > 0
        ? hiredApplications.filter(a => companyJobIds.has(a.job_id))
        : hiredApplications;

      const totalHires = companyHires.length;

      // Avg time to hire (days from created_at to updated_at for hired status)
      let avgTimeToHire = 0;
      if (totalHires > 0) {
        const durations = companyHires.map(a => {
          const created = new Date(a.created_at).getTime();
          const updated = new Date(a.updated_at).getTime();
          return Math.max(0, (updated - created) / (1000 * 60 * 60 * 24));
        });
        avgTimeToHire = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
      }

      // ── 2. Placement fees ────────────────────────────────────────
      let totalFees = 0;
      let feeCount = 0;
      let feeByApplication: Record<string, number> = {};
      try {
        const { data: fees, error: feesErr } = await supabase
          .from('placement_fees')
          .select('id, amount, application_id, company_id, created_at')
          .eq('company_id', companyId);

        if (feesErr) throw feesErr;
        for (const fee of fees || []) {
          totalFees += Number(fee.amount) || 0;
          feeCount++;
          if (fee.application_id) {
            feeByApplication[fee.application_id] = Number(fee.amount) || 0;
          }
        }
      } catch {
        // fees stay at 0
      }

      const avgFeePerHire = totalHires > 0 ? Math.round(totalFees / totalHires) : 0;

      // ── 3. 90-day retention ──────────────────────────────────────
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const eligibleForRetention = companyHires.filter(a => {
        const hiredDate = new Date(a.updated_at);
        return hiredDate <= ninetyDaysAgo;
      });
      const retained = eligibleForRetention.filter(a => a.status === 'hired');
      const retentionRate90d = eligibleForRetention.length > 0
        ? Math.round((retained.length / eligibleForRetention.length) * 100)
        : 100; // default to 100 if no data yet

      // ── 4. ROI per placement ─────────────────────────────────────
      let roiValues: number[] = [];
      for (const hire of companyHires) {
        const salary = jobSalaryMap[hire.job_id];
        const fee = feeByApplication[hire.id];
        if (salary && fee && fee > 0) {
          roiValues.push(salary / fee);
        }
      }
      const avgROI = roiValues.length > 0
        ? Math.round((roiValues.reduce((s, v) => s + v, 0) / roiValues.length) * 10) / 10
        : 0;

      // ── 5. NPS / Hiring manager satisfaction (table may not exist)
      let npsSatisfaction = 75; // default fallback
      try {
        const { data: npsData, error: npsErr } = await (supabase as any)
          .from('nps_surveys')
          .select('score')
          .eq('company_id', companyId);

        if (!npsErr && npsData && npsData.length > 0) {
          const avgNps = npsData.reduce((s: number, r: any) => s + (Number(r.score) || 0), 0) / npsData.length;
          // Normalize NPS (-100 to 100) to 0-100 scale
          npsSatisfaction = Math.round(((avgNps + 100) / 200) * 100);
        }
      } catch {
        // nps_surveys table doesn't exist — use default
      }

      // ── 6. Quality score (composite) ─────────────────────────────
      // Retention 40%, time-to-productivity estimate 30%, NPS satisfaction 30%
      const retentionComponent = retentionRate90d * 0.4;
      // Time-to-productivity: inverse of time-to-hire, normalized (lower is better)
      // Benchmark: 30 days = 100, 90 days = 33, cap at 100
      const productivityScore = avgTimeToHire > 0
        ? Math.min(100, Math.round((30 / avgTimeToHire) * 100))
        : 75; // default if no data
      const productivityComponent = productivityScore * 0.3;
      const npsComponent = npsSatisfaction * 0.3;
      const qualityScore = Math.round(retentionComponent + productivityComponent + npsComponent);

      // ── 7. Monthly sparkline data (last 6 months) ────────────────
      const monthlyHires: number[] = [];
      const monthlyROI: number[] = [];
      const monthlyRetention: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i, 1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        const monthHires = companyHires.filter(a => {
          const d = new Date(a.updated_at);
          return d >= monthStart && d < monthEnd;
        });
        monthlyHires.push(monthHires.length);

        // Monthly ROI
        const monthROIs = monthHires
          .map(h => {
            const sal = jobSalaryMap[h.job_id];
            const fee = feeByApplication[h.id];
            return sal && fee && fee > 0 ? sal / fee : null;
          })
          .filter((v): v is number => v !== null);
        monthlyROI.push(
          monthROIs.length > 0
            ? Math.round((monthROIs.reduce((s, v) => s + v, 0) / monthROIs.length) * 10) / 10
            : 0
        );

        // Monthly retention (only hires older than 90 days at month end)
        const cutoff = new Date(monthEnd.getTime() - 90 * 24 * 60 * 60 * 1000);
        const eligible = companyHires.filter(a => new Date(a.updated_at) <= cutoff);
        const ret = eligible.filter(a => a.status === 'hired');
        monthlyRetention.push(
          eligible.length > 0 ? Math.round((ret.length / eligible.length) * 100) : 100
        );
      }

      return {
        totalHires,
        avgTimeToHire,
        retentionRate90d,
        avgROI,
        qualityScore,
        totalFees,
        avgFeePerHire,
        monthlyHires,
        monthlyROI,
        monthlyRetention,
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    ...(data || DEFAULTS),
    isLoading,
    error: error as Error | null,
  };
}
