import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/contexts/RoleContext';
import { useCompanyIntelligenceData, CompanyIntelligence } from '@/hooks/useCompanyIntelligenceData';

// ── Types ──────────────────────────────────────────────────────────
export interface QuarterlySnapshot {
  quarter: string; // e.g. "Q1 2026"
  snapshotDate: string;
  totalApplications: number;
  activeJobs: number;
  totalHires: number;
  avgTimeToHire: number | null;
  offerAcceptanceRate: number | null;
}

export interface PipelineStageSummary {
  stage: string;
  count: number;
}

export interface OpenRoleSummary {
  id: string;
  title: string;
  createdAt: string;
  applicationCount: number;
  daysSincePosted: number;
}

export interface PartnerBriefingData {
  currentMetrics: CompanyIntelligence;
  quarterlyTrends: QuarterlySnapshot[];
  pipelineSummary: PipelineStageSummary[];
  openRoles: OpenRoleSummary[];
  isLoading: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────
function toQuarterLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
}

function daysBetween(a: string, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - new Date(a).getTime()) / 86_400_000));
}

// ── Hook ───────────────────────────────────────────────────────────
export function usePartnerBriefingData(): PartnerBriefingData {
  const { companyId } = useRole();
  const { data: currentMetrics, isLoading: metricsLoading } = useCompanyIntelligenceData();

  // Quarterly snapshots (last 4 quarters)
  const { data: quarterlyTrends = [], isLoading: trendsLoading } = useQuery({
    queryKey: ['briefing-quarterly-trends', companyId],
    queryFn: async (): Promise<QuarterlySnapshot[]> => {
      if (!companyId) return [];
      try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const { data, error } = await (supabase as any)
          .from('partner_analytics_snapshots')
          .select('metrics, snapshot_date')
          .eq('company_id', companyId)
          .gte('snapshot_date', oneYearAgo.toISOString().split('T')[0])
          .order('snapshot_date', { ascending: true });

        if (error || !data) return [];

        // Group by quarter, keep last snapshot per quarter
        const quarterMap = new Map<string, QuarterlySnapshot>();
        for (const row of data) {
          const label = toQuarterLabel(row.snapshot_date);
          const m = row.metrics || {};
          quarterMap.set(label, {
            quarter: label,
            snapshotDate: row.snapshot_date,
            totalApplications: m.total_applications ?? 0,
            activeJobs: m.active_jobs ?? 0,
            totalHires: m.total_hires ?? 0,
            avgTimeToHire: m.avg_time_to_hire ?? null,
            offerAcceptanceRate: m.offer_acceptance_rate ?? null,
          });
        }
        return Array.from(quarterMap.values()).slice(-4);
      } catch {
        return [];
      }
    },
    enabled: !!companyId,
    staleTime: 300_000,
  });

  // Pipeline summary (applications by stage)
  const { data: pipelineSummary = [], isLoading: pipelineLoading } = useQuery({
    queryKey: ['briefing-pipeline-summary', companyId],
    queryFn: async (): Promise<PipelineStageSummary[]> => {
      if (!companyId) return [];
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('stage')
          .eq('company_id', companyId);

        if (error || !data) return [];

        const counts = new Map<string, number>();
        for (const row of data) {
          const stage = (row as any).stage || 'unknown';
          counts.set(stage, (counts.get(stage) || 0) + 1);
        }

        return Array.from(counts.entries())
          .map(([stage, count]) => ({ stage, count }))
          .sort((a, b) => b.count - a.count);
      } catch {
        return [];
      }
    },
    enabled: !!companyId,
    staleTime: 300_000,
  });

  // Open roles with application counts
  const { data: openRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['briefing-open-roles', companyId],
    queryFn: async (): Promise<OpenRoleSummary[]> => {
      if (!companyId) return [];
      try {
        const { data: jobs, error } = await supabase
          .from('jobs')
          .select('id, title, created_at')
          .eq('company_id', companyId)
          .eq('status', 'open');

        if (error || !jobs) return [];

        const now = new Date();
        const { data: appData } = await supabase
          .from('applications')
          .select('job_id')
          .eq('company_id', companyId);

        const appCounts = new Map<string, number>();
        if (appData) {
          for (const row of appData) {
            const jid = (row as any).job_id;
            if (jid) appCounts.set(jid, (appCounts.get(jid) || 0) + 1);
          }
        }

        return jobs.map((j: any) => ({
          id: j.id,
          title: j.title || 'Untitled Role',
          createdAt: j.created_at,
          applicationCount: appCounts.get(j.id) || 0,
          daysSincePosted: daysBetween(j.created_at, now),
        }));
      } catch {
        return [];
      }
    },
    enabled: !!companyId,
    staleTime: 300_000,
  });

  return {
    currentMetrics,
    quarterlyTrends,
    pipelineSummary,
    openRoles,
    isLoading: metricsLoading || trendsLoading || pipelineLoading || rolesLoading,
  };
}
