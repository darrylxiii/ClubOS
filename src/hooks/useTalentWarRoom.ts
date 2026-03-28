import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/contexts/RoleContext';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import { toast } from 'sonner';
import { useMemo, useRef, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────

export interface CompetitorRole {
  id: string;
  title: string;
  anonymizedCompany: string;
  salaryMin: number | null;
  salaryMax: number | null;
  postedAt: string;
  overlapSkillset: string;
}

export interface FlightRisk {
  id: string;
  candidateName: string;
  currentStage: string;
  riskScore: number;
  riskFactors: string[];
  jobTitle: string;
}

export interface SalaryMovement {
  category: string;
  changePercent: number;
  direction: 'up' | 'down' | 'stable';
  sparklineData: number[];
}

export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';

export interface TalentWarRoomData {
  competitors: CompetitorRole[];
  flightRisks: FlightRisk[];
  salaryMovements: SalaryMovement[];
  threatLevel: ThreatLevel;
  competitorCount: number;
  flightRiskCount: number;
  avgSalaryPressure: number;
  isLoading: boolean;
  isError: boolean;
  lastUpdated: Date | null;
}

// ── Defaults ───────────────────────────────────────────────────────

const DEFAULTS: Omit<TalentWarRoomData, 'isLoading' | 'isError'> = {
  competitors: [],
  flightRisks: [],
  salaryMovements: [],
  threatLevel: 'low',
  competitorCount: 0,
  flightRiskCount: 0,
  avgSalaryPressure: 0,
  lastUpdated: null,
};

// ── Helpers ────────────────────────────────────────────────────────

const COMPANY_ALIASES = [
  'Alpha Corp', 'Beta Industries', 'Gamma Tech', 'Delta Group',
  'Epsilon Labs', 'Zeta Solutions', 'Eta Partners', 'Theta Ventures',
  'Iota Digital', 'Kappa Systems',
];

function anonymizeCompany(id: string): string {
  // Stable hash from the id to assign a consistent alias
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return COMPANY_ALIASES[Math.abs(hash) % COMPANY_ALIASES.length];
}

function extractCategory(title: string): string {
  const lower = (title || '').toLowerCase();
  if (/engineer|develop|software|backend|frontend|fullstack/i.test(lower)) return 'Engineering';
  if (/product|pm\b/i.test(lower)) return 'Product';
  if (/design|ux|ui/i.test(lower)) return 'Design';
  if (/market|growth|seo|content/i.test(lower)) return 'Marketing';
  if (/sale|account|business dev/i.test(lower)) return 'Sales';
  if (/data|analyt|scientist/i.test(lower)) return 'Data';
  if (/ops|operations|devops|sre/i.test(lower)) return 'Operations';
  if (/hr|recruit|talent|people/i.test(lower)) return 'People';
  if (/financ|account/i.test(lower)) return 'Finance';
  return 'General';
}

function computeThreatLevel(
  competitorCount: number,
  flightRiskCount: number,
  avgSalaryPressure: number
): ThreatLevel {
  const score =
    Math.min(competitorCount * 10, 40) +
    Math.min(flightRiskCount * 15, 35) +
    Math.min(Math.abs(avgSalaryPressure) * 5, 25);

  if (score >= 70) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

// ── Hook ───────────────────────────────────────────────────────────

/**
 * Aggregates real-time war room intelligence:
 * - Competitor hiring activity (other companies hiring for similar roles)
 * - Flight risk radar (pipeline candidates with high move probability)
 * - Salary movements by role category
 * - Computed threat level
 */
export function useTalentWarRoom(): TalentWarRoomData {
  const { companyId } = useRole();
  const lastUpdatedRef = useRef<Date | null>(null);

  // Stable subscription configs for useRealtimeChannel
  const subscriptions = useMemo(
    () => [
      {
        table: 'jobs',
        event: '*' as const,
        invalidateKeys: [['talent-war-room', companyId]],
        onEvent: () => {
          lastUpdatedRef.current = new Date();
          toast.info('War Room updated', { description: 'New market activity detected' });
        },
      },
      {
        table: 'applications',
        event: '*' as const,
        invalidateKeys: [['talent-war-room', companyId]],
        onEvent: () => {
          lastUpdatedRef.current = new Date();
        },
      },
    ],
    [companyId]
  );

  useRealtimeChannel({
    channelName: `war-room-${companyId}`,
    subscriptions,
    enabled: !!companyId,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['talent-war-room', companyId],
    queryFn: async () => {
      if (!companyId) return DEFAULTS;

      // ── 1. Fetch own company jobs (to identify categories) ──────
      let ownJobs: any[] = [];
      try {
        const { data: jobsData, error } = await supabase
          .from('jobs')
          .select('id, title, status, salary_min, salary_max, company_id, created_at')
          .eq('company_id', companyId);
        if (error) throw error;
        ownJobs = jobsData || [];
      } catch {
        ownJobs = [];
      }

      const activeOwnJobs = ownJobs.filter(
        (j) => j.status === 'open' || j.status === 'active' || j.status === 'published'
      );
      const ownCategories = new Set(activeOwnJobs.map((j) => extractCategory(j.title)));
      const ownJobIds = new Set(ownJobs.map((j) => j.id));

      // ── 2. Fetch competitor jobs (other companies) ──────────────
      let competitorJobs: any[] = [];
      try {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const { data: cData, error } = await supabase
          .from('jobs')
          .select('id, title, company_id, salary_min, salary_max, created_at, status')
          .neq('company_id', companyId)
          .gte('created_at', threeMonthsAgo.toISOString());
        if (error) throw error;
        competitorJobs = (cData || []).filter(
          (j: any) => j.status === 'open' || j.status === 'active' || j.status === 'published'
        );
      } catch {
        competitorJobs = [];
      }

      // Filter competitors to roles matching own categories
      const competitors: CompetitorRole[] = competitorJobs
        .filter((j) => ownCategories.has(extractCategory(j.title)))
        .map((j) => ({
          id: j.id,
          title: j.title || 'Unknown Role',
          anonymizedCompany: anonymizeCompany(j.company_id),
          salaryMin: j.salary_min,
          salaryMax: j.salary_max,
          postedAt: j.created_at,
          overlapSkillset: extractCategory(j.title),
        }));

      // ── 3. Fetch flight risk data from ml_predictions / match_scores
      let flightRisks: FlightRisk[] = [];
      try {
        // Try ml_predictions for move probability
        const { data: mlData, error: mlErr } = await (supabase as any)
          .from('ml_predictions')
          .select('*')
          .eq('company_id', companyId)
          .eq('prediction_type', 'move_probability');

        if (!mlErr && mlData && mlData.length > 0) {
          flightRisks = mlData
            .filter((p: any) => (p.predicted_value ?? 0) >= 40)
            .map((p: any) => ({
              id: p.id || p.candidate_id || crypto.randomUUID(),
              candidateName: p.candidate_name || 'Candidate',
              currentStage: p.stage || 'Pipeline',
              riskScore: Math.round(p.predicted_value ?? 50),
              riskFactors: buildRiskFactors(p.predicted_value ?? 50),
              jobTitle: p.job_title || 'Open Role',
            }))
            .sort((a: FlightRisk, b: FlightRisk) => b.riskScore - a.riskScore);
        } else {
          // Fallback: derive from match_scores (low scores = high flight risk)
          const { data: msData, error: msErr } = await (supabase as any)
            .from('match_scores')
            .select('*')
            .in('job_id', Array.from(ownJobIds));

          if (!msErr && msData) {
            flightRisks = msData
              .filter((ms: any) => {
                const score = Number(ms.overall_score ?? ms.score ?? 100);
                return score < 60; // Low engagement = flight risk
              })
              .map((ms: any) => {
                const score = Number(ms.overall_score ?? ms.score ?? 50);
                const riskScore = Math.round(100 - score);
                return {
                  id: ms.id || crypto.randomUUID(),
                  candidateName: ms.candidate_name || 'Candidate',
                  currentStage: ms.stage || 'Pipeline',
                  riskScore,
                  riskFactors: buildRiskFactors(riskScore),
                  jobTitle: ms.job_title || 'Open Role',
                };
              })
              .sort((a: FlightRisk, b: FlightRisk) => b.riskScore - a.riskScore)
              .slice(0, 20);
          }
        }
      } catch {
        flightRisks = [];
      }

      // ── 4. Compute salary movements by category ─────────────────
      const salaryMovements: SalaryMovement[] = [];
      const allJobs = [...ownJobs, ...competitorJobs].filter(
        (j) => j.salary_max || j.salary_min
      );

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Group by category and compute recent vs. prior avg salary
      const categoryJobs: Record<string, any[]> = {};
      for (const j of allJobs) {
        const cat = extractCategory(j.title);
        if (!categoryJobs[cat]) categoryJobs[cat] = [];
        categoryJobs[cat].push(j);
      }

      for (const [category, jobs] of Object.entries(categoryJobs)) {
        const recentJobs = jobs.filter((j) => new Date(j.created_at) >= threeMonthsAgo);
        const priorJobs = jobs.filter(
          (j) =>
            new Date(j.created_at) >= sixMonthsAgo &&
            new Date(j.created_at) < threeMonthsAgo
        );

        const avgRecent = avgSalary(recentJobs);
        const avgPrior = avgSalary(priorJobs);

        if (avgRecent > 0) {
          const changePercent =
            avgPrior > 0
              ? Math.round(((avgRecent - avgPrior) / avgPrior) * 1000) / 10
              : 0;
          const direction: 'up' | 'down' | 'stable' =
            changePercent > 1 ? 'up' : changePercent < -1 ? 'down' : 'stable';

          // Build 6-point sparkline (monthly salary averages)
          const sparklineData: number[] = [];
          for (let i = 5; i >= 0; i--) {
            const monthStart = new Date();
            monthStart.setMonth(monthStart.getMonth() - i, 1);
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);

            const monthJobs = jobs.filter((j) => {
              const d = new Date(j.created_at);
              return d >= monthStart && d < monthEnd;
            });
            sparklineData.push(avgSalary(monthJobs) || avgRecent);
          }

          salaryMovements.push({ category, changePercent, direction, sparklineData });
        }
      }

      salaryMovements.sort(
        (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
      );

      // ── 5. Compute threat level ─────────────────────────────────
      const competitorCount = competitors.length;
      const flightRiskCount = flightRisks.filter((r) => r.riskScore >= 50).length;
      const avgSalaryPressure =
        salaryMovements.length > 0
          ? salaryMovements.reduce((s, m) => s + m.changePercent, 0) /
            salaryMovements.length
          : 0;

      const threatLevel = computeThreatLevel(
        competitorCount,
        flightRiskCount,
        avgSalaryPressure
      );

      lastUpdatedRef.current = new Date();

      return {
        competitors,
        flightRisks,
        salaryMovements,
        threatLevel,
        competitorCount,
        flightRiskCount,
        avgSalaryPressure: Math.round(avgSalaryPressure * 10) / 10,
        lastUpdated: lastUpdatedRef.current,
      };
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 min — war room needs fresher data
    refetchInterval: 5 * 60 * 1000, // auto-refetch every 5 min
  });

  return {
    ...(data ?? DEFAULTS),
    isLoading,
    isError,
  };
}

// ── Internal helpers ───────────────────────────────────────────────

function avgSalary(jobs: any[]): number {
  const salaries = jobs
    .map((j) => j.salary_max || j.salary_min || 0)
    .filter((s) => s > 0);
  if (salaries.length === 0) return 0;
  return Math.round(salaries.reduce((s, v) => s + v, 0) / salaries.length);
}

function buildRiskFactors(riskScore: number): string[] {
  const factors: string[] = [];
  if (riskScore >= 80) factors.push('High market demand for skillset');
  if (riskScore >= 70) factors.push('Competitors actively hiring');
  if (riskScore >= 60) factors.push('Below-market compensation');
  if (riskScore >= 50) factors.push('Extended time in pipeline');
  if (riskScore >= 40) factors.push('Declining engagement signals');
  return factors;
}
