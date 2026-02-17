import { useQuery } from '@tanstack/react-query';
import { untypedTable } from '@/lib/supabaseRpc';

export type KPIRange = '30d' | '3m' | '6m' | '1y' | 'all';

export interface KPIPillarMetric {
  value: number | null;
  label: string;
  format: 'days' | 'percent' | 'currency' | 'score' | 'ratio';
  lowerIsBetter?: boolean;
}

export interface KPIScorecardData {
  efficiency: { timeToShortlist: KPIPillarMetric; slaCompliance: KPIPillarMetric; timeToHire: KPIPillarMetric };
  profitability: { revenuePerPlacement: KPIPillarMetric; pipelineConversion: KPIPillarMetric; totalRevenue: KPIPillarMetric };
  operations: { fillRate: KPIPillarMetric; offerAcceptance: KPIPillarMetric; interviewToHire: KPIPillarMetric };
  nps: { candidateNPS: KPIPillarMetric; partnerNPS: KPIPillarMetric };
}

function calcNPS(surveys: any[], type: string): number | null {
  const filtered = surveys.filter((s: any) =>
    type === 'candidate' ? s.respondent_type === 'candidate' : ['partner', 'client'].includes(s.respondent_type)
  );
  if (filtered.length === 0) return null;
  const promoters = filtered.filter((s: any) => s.nps_score >= 9).length;
  const detractors = filtered.filter((s: any) => s.nps_score <= 6).length;
  return Math.round(((promoters - detractors) / filtered.length) * 100);
}

function getSinceDate(range: KPIRange): Date | null {
  if (range === 'all') return null;
  const now = new Date();
  switch (range) {
    case '30d': now.setDate(now.getDate() - 30); break;
    case '3m': now.setMonth(now.getMonth() - 3); break;
    case '6m': now.setMonth(now.getMonth() - 6); break;
    case '1y': now.setFullYear(now.getFullYear() - 1); break;
  }
  return now;
}

export function useAdminKPIScorecard(range: KPIRange = '30d') {
  return useQuery({
    queryKey: ['admin-kpi-scorecard', range],
    queryFn: async (): Promise<KPIScorecardData> => {
      const since = getSinceDate(range);
      const sinceISO = since?.toISOString();

      // Build queries with optional date filter
      let appsQ = untypedTable('applications').select('status, created_at, updated_at, stage_updated_at');
      let jobsQ = untypedTable('jobs').select('status, hired_count');
      let hiresQ = untypedTable('continuous_pipeline_hires').select('placement_fee');
      let npsQ = untypedTable('nps_surveys').select('nps_score, respondent_type, response_date');
      let interviewsQ = untypedTable('interviews').select('id, created_at');
      let feesQ = untypedTable('placement_fees').select('fee_amount, status, created_at');

      if (sinceISO) {
        appsQ = appsQ.gte('created_at', sinceISO);
        jobsQ = jobsQ.gte('created_at', sinceISO);
        hiresQ = hiresQ.gte('created_at', sinceISO);
        npsQ = npsQ.gte('response_date', sinceISO);
        interviewsQ = interviewsQ.gte('created_at', sinceISO);
        feesQ = feesQ.gte('created_at', sinceISO);
      }

      const [appsRes, jobsRes, hiresRes, npsRes, interviewsRes, feesRes] = await Promise.all([
        appsQ, jobsQ, hiresQ, npsQ, interviewsQ, feesQ,
      ]);

      const apps = appsRes.data || [];
      const jobs = jobsRes.data || [];
      const hires = hiresRes.data || [];
      const npsSurveys = npsRes.data || [];
      const interviews = interviewsRes.data || [];
      const fees = feesRes.data || [];

      // === Efficiency ===
      const shortlistApps = apps.filter((a: any) => a.stage_updated_at && a.status !== 'applied');
      let timeToShortlist: number | null = null;
      if (shortlistApps.length > 0) {
        const totalDays = shortlistApps.reduce((sum: number, a: any) => {
          const diff = (new Date(a.stage_updated_at).getTime() - new Date(a.created_at).getTime()) / 86400000;
          return sum + diff;
        }, 0);
        timeToShortlist = Math.round((totalDays / shortlistApps.length) * 10) / 10;
      }

      const activeApps = apps.filter((a: any) => ['active', 'screening', 'interview'].includes(a.status));
      let slaCompliance: number | null = null;
      if (activeApps.length > 0) {
        const compliant = activeApps.filter((a: any) => {
          const diff = (new Date(a.updated_at).getTime() - new Date(a.created_at).getTime()) / 86400000;
          return diff <= 7;
        }).length;
        slaCompliance = Math.round((compliant / activeApps.length) * 100);
      }

      // Time-to-Hire
      const hiredApps = apps.filter((a: any) => a.status === 'hired' && a.stage_updated_at);
      let timeToHire: number | null = null;
      if (hiredApps.length > 0) {
        const totalDays = hiredApps.reduce((sum: number, a: any) => {
          const diff = (new Date(a.stage_updated_at).getTime() - new Date(a.created_at).getTime()) / 86400000;
          return sum + diff;
        }, 0);
        timeToHire = Math.round((totalDays / hiredApps.length) * 10) / 10;
      }

      // === Profitability ===
      const paidHires = hires.filter((h: any) => h.placement_fee > 0);
      const revenuePerPlacement = paidHires.length > 0
        ? Math.round(paidHires.reduce((s: number, h: any) => s + Number(h.placement_fee), 0) / paidHires.length)
        : null;

      const pipelineConversion = apps.length > 0
        ? Math.round((apps.filter((a: any) => a.status === 'hired').length / apps.length) * 1000) / 10
        : null;

      // Total Revenue from placement_fees
      const activeFees = fees.filter((f: any) => f.status !== 'cancelled');
      const totalRevenue = activeFees.length > 0
        ? Math.round(activeFees.reduce((s: number, f: any) => s + Number(f.fee_amount || 0), 0))
        : null;

      // === Operations ===
      const relevantJobs = jobs.filter((j: any) => j.status === 'closed' || (j.hired_count && j.hired_count > 0));
      const fillRate = relevantJobs.length > 0
        ? Math.round((relevantJobs.filter((j: any) => j.hired_count > 0).length / relevantJobs.length) * 100)
        : null;

      const hiredOrRejected = apps.filter((a: any) => ['hired', 'rejected'].includes(a.status));
      const offerAcceptance = hiredOrRejected.length > 0
        ? Math.round((hiredOrRejected.filter((a: any) => a.status === 'hired').length / hiredOrRejected.length) * 100)
        : null;

      // Interview-to-Hire Ratio
      const hiredCount = apps.filter((a: any) => a.status === 'hired').length;
      const interviewCount = interviews.length;
      const interviewToHire = hiredCount > 0 ? Math.round((interviewCount / hiredCount) * 10) / 10 : null;

      // === NPS ===
      const candidateNPS = calcNPS(npsSurveys, 'candidate');
      const partnerNPS = calcNPS(npsSurveys, 'partner');

      return {
        efficiency: {
          timeToShortlist: { value: timeToShortlist, label: 'Time to Shortlist', format: 'days', lowerIsBetter: true },
          slaCompliance: { value: slaCompliance, label: 'SLA Compliance', format: 'percent' },
          timeToHire: { value: timeToHire, label: 'Time to Hire', format: 'days', lowerIsBetter: true },
        },
        profitability: {
          revenuePerPlacement: { value: revenuePerPlacement, label: 'Rev / Placement', format: 'currency' },
          pipelineConversion: { value: pipelineConversion, label: 'Pipeline Conv.', format: 'percent' },
          totalRevenue: { value: totalRevenue, label: 'Total Revenue', format: 'currency' },
        },
        operations: {
          fillRate: { value: fillRate, label: 'Fill Rate', format: 'percent' },
          offerAcceptance: { value: offerAcceptance, label: 'Offer Accept', format: 'percent' },
          interviewToHire: { value: interviewToHire, label: 'Interview:Hire', format: 'ratio' },
        },
        nps: {
          candidateNPS: { value: candidateNPS, label: 'Candidate NPS', format: 'score' },
          partnerNPS: { value: partnerNPS, label: 'Partner NPS', format: 'score' },
        },
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
