import { useQuery } from '@tanstack/react-query';
import { untypedTable } from '@/lib/supabaseRpc';

export interface KPIPillarMetric {
  value: number | null;
  label: string;
  format: 'days' | 'percent' | 'currency' | 'score';
  lowerIsBetter?: boolean;
}

export interface KPIScorecardData {
  efficiency: { timeToShortlist: KPIPillarMetric; slaCompliance: KPIPillarMetric };
  profitability: { revenuePerPlacement: KPIPillarMetric; pipelineConversion: KPIPillarMetric };
  operations: { fillRate: KPIPillarMetric; offerAcceptance: KPIPillarMetric };
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

export function useAdminKPIScorecard() {
  return useQuery({
    queryKey: ['admin-kpi-scorecard'],
    queryFn: async (): Promise<KPIScorecardData> => {
      // Fetch all data sources in parallel
      const [appsRes, jobsRes, hiresRes, npsRes] = await Promise.all([
        untypedTable('applications').select('status, created_at, updated_at, stage_updated_at'),
        untypedTable('jobs').select('status, hired_count'),
        untypedTable('continuous_pipeline_hires').select('placement_fee'),
        untypedTable('nps_surveys').select('nps_score, respondent_type, response_date'),
      ]);

      const apps = appsRes.data || [];
      const jobs = jobsRes.data || [];
      const hires = hiresRes.data || [];
      const npsSurveys = npsRes.data || [];

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

      // === Profitability ===
      const paidHires = hires.filter((h: any) => h.placement_fee > 0);
      const revenuePerPlacement = paidHires.length > 0
        ? Math.round(paidHires.reduce((s: number, h: any) => s + Number(h.placement_fee), 0) / paidHires.length)
        : null;

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const recentApps = apps.filter((a: any) => new Date(a.created_at) >= ninetyDaysAgo);
      const pipelineConversion = recentApps.length > 0
        ? Math.round((recentApps.filter((a: any) => a.status === 'hired').length / recentApps.length) * 1000) / 10
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

      // === NPS ===
      const candidateNPS = calcNPS(npsSurveys, 'candidate');
      const partnerNPS = calcNPS(npsSurveys, 'partner');

      return {
        efficiency: {
          timeToShortlist: { value: timeToShortlist, label: 'Time to Shortlist', format: 'days', lowerIsBetter: true },
          slaCompliance: { value: slaCompliance, label: 'SLA Compliance', format: 'percent' },
        },
        profitability: {
          revenuePerPlacement: { value: revenuePerPlacement, label: 'Rev / Placement', format: 'currency' },
          pipelineConversion: { value: pipelineConversion, label: 'Pipeline Conv.', format: 'percent' },
        },
        operations: {
          fillRate: { value: fillRate, label: 'Fill Rate', format: 'percent' },
          offerAcceptance: { value: offerAcceptance, label: 'Offer Accept', format: 'percent' },
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
