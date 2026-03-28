import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/contexts/RoleContext';
import { useCompanyIntelligenceData } from '@/hooks/useCompanyIntelligenceData';
import { usePredictiveHiring } from '@/hooks/usePredictiveHiring';
import { useTalentWarRoom } from '@/hooks/useTalentWarRoom';
import { useMarketAlerts } from '@/hooks/useMarketAlerts';

// ── Types ──────────────────────────────────────────────────────────

export type ActionType =
  | 'review_candidates'
  | 'adjust_offer'
  | 'accelerate_pipeline'
  | 'schedule_meeting'
  | 'send_outreach';

export type ActionUrgency = 'critical' | 'high' | 'medium';

export interface PrioritizedAction {
  id: string;
  type: ActionType;
  urgency: ActionUrgency;
  title: string;
  description: string;
  /** urgency * impact composite score for sorting (higher = more urgent) */
  score: number;
}

export interface Bottleneck {
  id: string;
  stage: string;
  avgDays: number;
  candidatesStuck: number;
  benchmarkDays: number;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export interface WeeklyUpdate {
  hiresThisWeek: number;
  newCandidates: number;
  offersSent: number;
  pipelineHealth: 'excellent' | 'good' | 'needs-attention' | 'critical';
  keyEvents: string[];
  narrativeText: string;
}

export type InsightCategory = 'opportunity' | 'risk' | 'recommendation' | 'milestone';

export interface ProactiveInsight {
  id: string;
  category: InsightCategory;
  title: string;
  description: string;
  confidence: number;
  actionLabel?: string;
  timestamp: string;
}

export interface ThreatSummary {
  overallLevel: 'low' | 'medium' | 'high' | 'critical';
  topThreats: string[];
  competitorCount: number;
  flightRiskCount: number;
}

export interface AIChiefOfStaffData {
  prioritizedActions: PrioritizedAction[];
  bottlenecks: Bottleneck[];
  weeklyUpdate: WeeklyUpdate;
  proactiveInsights: ProactiveInsight[];
  threatSummary: ThreatSummary;
  isLoading: boolean;
  isError: boolean;
}

// ── Defaults ───────────────────────────────────────────────────────

const DEFAULT_WEEKLY: WeeklyUpdate = {
  hiresThisWeek: 0,
  newCandidates: 0,
  offersSent: 0,
  pipelineHealth: 'good',
  keyEvents: [],
  narrativeText: '',
};

const DEFAULT_THREAT: ThreatSummary = {
  overallLevel: 'low',
  topThreats: [],
  competitorCount: 0,
  flightRiskCount: 0,
};

const DEFAULTS: Omit<AIChiefOfStaffData, 'isLoading' | 'isError'> = {
  prioritizedActions: [],
  bottlenecks: [],
  weeklyUpdate: DEFAULT_WEEKLY,
  proactiveInsights: [],
  threatSummary: DEFAULT_THREAT,
};

// ── Helpers ────────────────────────────────────────────────────────

function urgencyWeight(u: ActionUrgency): number {
  if (u === 'critical') return 3;
  if (u === 'high') return 2;
  return 1;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function determinePipelineHealth(
  healthScore: number | null,
  bottleneckCount: number,
  criticalTTF: number,
): WeeklyUpdate['pipelineHealth'] {
  if (healthScore !== null) {
    if (healthScore >= 85) return 'excellent';
    if (healthScore >= 65) return 'good';
    if (healthScore >= 40) return 'needs-attention';
    return 'critical';
  }
  if (criticalTTF >= 3 || bottleneckCount >= 3) return 'critical';
  if (criticalTTF >= 1 || bottleneckCount >= 2) return 'needs-attention';
  return 'good';
}

// ── Hook ───────────────────────────────────────────────────────────

/**
 * Master orchestrator hook for the AI Chief of Staff.
 *
 * Combines data from all intelligence layers and generates:
 * - Prioritized action list sorted by urgency * impact
 * - Bottleneck detection for pipeline stages
 * - Weekly update summary
 * - Proactive insights feed
 * - Threat summary from War Room
 */
export function useAIChiefOfStaff(): AIChiefOfStaffData {
  const { companyId } = useRole();

  // Pull data from all intelligence sources
  const intelligence = useCompanyIntelligenceData();
  const predictive = usePredictiveHiring();
  const warRoom = useTalentWarRoom();
  const marketAlerts = useMarketAlerts(companyId ?? undefined);

  // Fetch raw pipeline data for bottleneck and weekly analysis
  const { data: orchestrated, isLoading: orchLoading, isError: orchError } = useQuery({
    queryKey: ['chief-of-staff-pipeline', companyId],
    queryFn: async () => {
      if (!companyId) return { applications: [], jobs: [], insights: [] };

      let applications: any[] = [];
      let jobs: any[] = [];
      let insights: any[] = [];

      try {
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('id, title, status, created_at')
          .eq('company_id', companyId);
        jobs = jobsData || [];
      } catch { /* graceful */ }

      const jobIds = jobs.map((j: any) => j.id);

      try {
        const { data: appsData } = await supabase
          .from('applications')
          .select('id, job_id, status, stage, created_at, updated_at');
        applications = (appsData || []).filter((a: any) => jobIds.includes(a.job_id));
      } catch { /* graceful */ }

      try {
        const { data: insightsData } = await (supabase as any)
          .from('partner_ai_insights')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(30);
        insights = insightsData || [];
      } catch { /* graceful */ }

      return { applications, jobs, insights };
    },
    enabled: !!companyId,
    staleTime: 3 * 60 * 1000,
  });

  const isLoading =
    intelligence.isLoading ||
    predictive.isLoading ||
    warRoom.isLoading ||
    marketAlerts.isLoading ||
    orchLoading;

  const isError = orchError;

  // Build all derived data when not loading
  if (isLoading || !orchestrated) {
    return { ...DEFAULTS, isLoading, isError };
  }

  try {
    const { applications, jobs, insights } = orchestrated;
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    const activeJobs = jobs.filter(
      (j: any) => j.status === 'open' || j.status === 'active' || j.status === 'published',
    );
    const activeJobIds = new Set(activeJobs.map((j: any) => j.id));
    const jobTitleMap = new Map(jobs.map((j: any) => [j.id, j.title || 'Untitled Role']));

    // ══════════════════════════════════════════════════════════════
    // 1. BOTTLENECK DETECTION
    // ══════════════════════════════════════════════════════════════
    const stageGroups: Record<string, { days: number[]; candidates: number }> = {};
    const activeApps = applications.filter(
      (a: any) =>
        activeJobIds.has(a.job_id) &&
        a.status !== 'hired' &&
        a.status !== 'rejected' &&
        a.status !== 'withdrawn',
    );

    for (const app of activeApps) {
      const stage = app.stage || app.status || 'applied';
      const daysInStage = Math.max(
        1,
        Math.round((now - new Date(app.updated_at).getTime()) / 86400000),
      );
      if (!stageGroups[stage]) stageGroups[stage] = { days: [], candidates: 0 };
      stageGroups[stage].days.push(daysInStage);
      stageGroups[stage].candidates += 1;
    }

    // Compute global average dwell time
    const allDwellDays = Object.values(stageGroups).flatMap((g) => g.days);
    const globalAvg =
      allDwellDays.length > 0
        ? allDwellDays.reduce((s, d) => s + d, 0) / allDwellDays.length
        : 5;

    const bottlenecks: Bottleneck[] = [];
    for (const [stage, group] of Object.entries(stageGroups)) {
      const stageAvg = group.days.reduce((s, d) => s + d, 0) / group.days.length;
      if (stageAvg > globalAvg * 1.3 && group.candidates >= 1) {
        const multiplier = Math.round((stageAvg / globalAvg) * 10) / 10;
        const severity: Bottleneck['severity'] =
          multiplier >= 3 ? 'critical' : multiplier >= 2 ? 'warning' : 'info';

        bottlenecks.push({
          id: generateId(),
          stage,
          avgDays: Math.round(stageAvg),
          candidatesStuck: group.candidates,
          benchmarkDays: Math.round(globalAvg),
          severity,
          message: `${group.candidates} candidate${group.candidates !== 1 ? 's have' : ' has'} been in ${stage} for ${Math.round(stageAvg)} days (${multiplier}x average)`,
        });
      }
    }
    bottlenecks.sort(
      (a, b) =>
        (a.severity === 'critical' ? 0 : a.severity === 'warning' ? 1 : 2) -
        (b.severity === 'critical' ? 0 : b.severity === 'warning' ? 1 : 2),
    );

    // ══════════════════════════════════════════════════════════════
    // 2. PRIORITIZED ACTIONS
    // ══════════════════════════════════════════════════════════════
    const prioritizedActions: PrioritizedAction[] = [];

    // --- Actions from TTF predictions (critical/behind roles) ---
    for (const ttf of predictive.timeToFillPredictions) {
      if (ttf.status === 'critical') {
        const jobApps = applications.filter(
          (a: any) => a.job_id === ttf.jobId && a.status !== 'rejected' && a.status !== 'withdrawn',
        );
        const atRisk = warRoom.flightRisks.filter((r) =>
          jobApps.some((a: any) => a.id === r.id),
        ).length;
        const desc =
          atRisk > 0
            ? `${jobApps.length} candidates in pipeline, ${atRisk} at risk of leaving. ${ttf.currentDaysOpen} days open (predicted ${ttf.predictedDays}).`
            : `${jobApps.length} candidates in pipeline. Open ${ttf.currentDaysOpen} days, ${ttf.currentDaysOpen - ttf.predictedDays} days behind schedule.`;

        prioritizedActions.push({
          id: generateId(),
          type: 'accelerate_pipeline',
          urgency: 'critical',
          title: `Accelerate hiring for ${ttf.title}`,
          description: desc,
          score: 3 * 9,
        });
      } else if (ttf.status === 'behind') {
        prioritizedActions.push({
          id: generateId(),
          type: 'review_candidates',
          urgency: 'high',
          title: `Review candidates for ${ttf.title}`,
          description: `Role is ${ttf.currentDaysOpen} days open against a ${ttf.predictedDays}-day target. Consider accelerating screening.`,
          score: 2 * 7,
        });
      }
    }

    // --- Actions from salary insights (adjust offers) ---
    for (const salary of predictive.salaryInsights) {
      prioritizedActions.push({
        id: generateId(),
        type: 'adjust_offer',
        urgency: salary.increasePercent >= 8 ? 'critical' : 'high',
        title: `Increase package for ${salary.title} by ${salary.increasePercent}%`,
        description: `Current acceptance probability: ${salary.currentAcceptanceProbability}%. A ${salary.increasePercent}% increase could raise it to ${salary.recommendedAcceptanceProbability}%.`,
        score: urgencyWeight(salary.increasePercent >= 8 ? 'critical' : 'high') * 8,
      });
    }

    // --- Actions from flight risks ---
    const highFlightRisks = warRoom.flightRisks.filter((r) => r.riskScore >= 70);
    if (highFlightRisks.length > 0) {
      const topRisk = highFlightRisks[0];
      prioritizedActions.push({
        id: generateId(),
        type: 'send_outreach',
        urgency: 'critical',
        title: `Counter-offer likely for ${topRisk.candidateName}`,
        description: `Flight risk score: ${topRisk.riskScore}%. ${topRisk.riskFactors.slice(0, 2).join('. ')}. Consider proactive outreach.`,
        score: 3 * 9,
      });
    }

    // --- Actions from competitor activity ---
    if (warRoom.competitorCount >= 3) {
      prioritizedActions.push({
        id: generateId(),
        type: 'accelerate_pipeline',
        urgency: warRoom.competitorCount >= 5 ? 'critical' : 'high',
        title: `${warRoom.competitorCount} competitors hiring for your skillsets`,
        description: `Accelerate screening to secure top talent before competitors close. Market pressure is ${warRoom.threatLevel}.`,
        score:
          urgencyWeight(warRoom.competitorCount >= 5 ? 'critical' : 'high') * 7,
      });
    }

    // --- Actions from market alerts (critical ones) ---
    const criticalAlerts = marketAlerts.alerts.filter(
      (a) => a.severity === 'critical' && !a.is_dismissed,
    );
    for (const alert of criticalAlerts.slice(0, 2)) {
      prioritizedActions.push({
        id: generateId(),
        type: 'review_candidates',
        urgency: 'critical',
        title: alert.title,
        description: alert.message,
        score: 3 * 8,
      });
    }

    // --- Actions from bottlenecks ---
    for (const bn of bottlenecks.filter((b) => b.severity === 'critical')) {
      prioritizedActions.push({
        id: generateId(),
        type: 'review_candidates',
        urgency: 'high',
        title: `Clear bottleneck in "${bn.stage}" stage`,
        description: bn.message,
        score: 2 * 7,
      });
    }

    // --- Generic review action if active jobs have candidates ---
    for (const job of activeJobs.slice(0, 3)) {
      const jobApps = applications.filter(
        (a: any) =>
          a.job_id === job.id &&
          a.status !== 'rejected' &&
          a.status !== 'withdrawn' &&
          a.status !== 'hired',
      );
      if (jobApps.length >= 3) {
        const atRisk = warRoom.flightRisks.filter((r) => r.jobTitle === job.title).length;
        if (atRisk > 0 && !prioritizedActions.some((pa) => pa.title.includes(job.title))) {
          prioritizedActions.push({
            id: generateId(),
            type: 'review_candidates',
            urgency: 'high',
            title: `Review ${jobApps.length} candidates for ${job.title} (${atRisk} at risk)`,
            description: `${atRisk} candidate${atRisk > 1 ? 's are' : ' is'} at risk of leaving pipeline. Review and take action before they disengage.`,
            score: 2 * 6,
          });
        }
      }
    }

    // Sort by composite score (descending)
    prioritizedActions.sort((a, b) => b.score - a.score);

    // ══════════════════════════════════════════════════════════════
    // 3. WEEKLY UPDATE
    // ══════════════════════════════════════════════════════════════
    const hiredThisWeek = applications.filter(
      (a: any) => a.status === 'hired' && new Date(a.updated_at).getTime() >= weekAgo,
    );
    const newThisWeek = applications.filter(
      (a: any) => new Date(a.created_at).getTime() >= weekAgo,
    );
    const offersThisWeek = applications.filter(
      (a: any) =>
        (a.status === 'offered' || a.stage === 'offer') &&
        new Date(a.updated_at).getTime() >= weekAgo,
    );

    const criticalTTF = predictive.timeToFillPredictions.filter(
      (t) => t.status === 'critical',
    ).length;
    const pipelineHealth = determinePipelineHealth(
      intelligence.data.healthScore,
      bottlenecks.length,
      criticalTTF,
    );

    const keyEvents: string[] = [];
    if (hiredThisWeek.length > 0) keyEvents.push(`${hiredThisWeek.length} hire${hiredThisWeek.length > 1 ? 's' : ''} completed`);
    if (offersThisWeek.length > 0) keyEvents.push(`${offersThisWeek.length} offer${offersThisWeek.length > 1 ? 's' : ''} sent`);
    if (newThisWeek.length > 0) keyEvents.push(`${newThisWeek.length} new candidate${newThisWeek.length > 1 ? 's' : ''} entered pipeline`);
    if (criticalAlerts.length > 0) keyEvents.push(`${criticalAlerts.length} critical alert${criticalAlerts.length > 1 ? 's' : ''} requiring attention`);
    if (highFlightRisks.length > 0) keyEvents.push(`${highFlightRisks.length} high flight risk${highFlightRisks.length > 1 ? 's' : ''} detected`);

    const healthLabel =
      pipelineHealth === 'excellent'
        ? 'Excellent'
        : pipelineHealth === 'good'
          ? 'Good'
          : pipelineHealth === 'needs-attention'
            ? 'Needs Attention'
            : 'Critical';

    const narrativeText = `This week: ${hiredThisWeek.length} hire${hiredThisWeek.length !== 1 ? 's' : ''}, ${newThisWeek.length} new candidate${newThisWeek.length !== 1 ? 's' : ''}, ${offersThisWeek.length} offer${offersThisWeek.length !== 1 ? 's' : ''} sent. Pipeline health: ${healthLabel}. ${activeJobs.length} active role${activeJobs.length !== 1 ? 's' : ''} with ${activeApps.length} candidate${activeApps.length !== 1 ? 's' : ''} in progress.${bottlenecks.length > 0 ? ` ${bottlenecks.length} bottleneck${bottlenecks.length > 1 ? 's' : ''} identified.` : ''}${highFlightRisks.length > 0 ? ` ${highFlightRisks.length} candidate${highFlightRisks.length > 1 ? 's' : ''} at high flight risk.` : ''}`;

    const weeklyUpdate: WeeklyUpdate = {
      hiresThisWeek: hiredThisWeek.length,
      newCandidates: newThisWeek.length,
      offersSent: offersThisWeek.length,
      pipelineHealth,
      keyEvents,
      narrativeText,
    };

    // ══════════════════════════════════════════════════════════════
    // 4. PROACTIVE INSIGHTS
    // ══════════════════════════════════════════════════════════════
    const proactiveInsights: ProactiveInsight[] = [];
    const isoNow = new Date().toISOString();

    // From AI insights table
    for (const ins of insights.slice(0, 10)) {
      const cat: InsightCategory =
        ins.insight_type === 'risk' || ins.insight_type === 'threat'
          ? 'risk'
          : ins.insight_type === 'opportunity'
            ? 'opportunity'
            : ins.insight_type === 'milestone'
              ? 'milestone'
              : 'recommendation';

      proactiveInsights.push({
        id: ins.id || generateId(),
        category: cat,
        title: ins.title || ins.insight_type || 'Insight',
        description: ins.description || ins.content || ins.message || '',
        confidence: ins.confidence ?? ins.confidence_score ?? 65,
        actionLabel: ins.action_label || undefined,
        timestamp: ins.created_at || isoNow,
      });
    }

    // Salary movement insights
    if (warRoom.avgSalaryPressure > 2) {
      proactiveInsights.push({
        id: generateId(),
        category: 'risk',
        title: 'Salary pressure rising in your market',
        description: `Average salary movement is +${warRoom.avgSalaryPressure}% across competing roles. Review compensation packages to stay competitive.`,
        confidence: 72,
        actionLabel: 'Review salaries',
        timestamp: isoNow,
      });
    }

    // Acceptance rate insight
    if (predictive.avgAcceptanceProbability > 0 && predictive.avgAcceptanceProbability < 60) {
      proactiveInsights.push({
        id: generateId(),
        category: 'recommendation',
        title: 'Offer acceptance rate below target',
        description: `Your average acceptance probability is ${predictive.avgAcceptanceProbability}%. Consider salary adjustments or improved candidate experience.`,
        confidence: 68,
        actionLabel: 'View salary insights',
        timestamp: isoNow,
      });
    } else if (predictive.avgAcceptanceProbability >= 80) {
      proactiveInsights.push({
        id: generateId(),
        category: 'milestone',
        title: 'Strong offer acceptance rate',
        description: `Your offer acceptance probability is ${predictive.avgAcceptanceProbability}% -- well above industry average. Keep up the great work.`,
        confidence: 82,
        timestamp: isoNow,
      });
    }

    // Pipeline velocity insight
    if (intelligence.data.pipelineVelocityScore !== null && intelligence.data.pipelineVelocityScore >= 80) {
      proactiveInsights.push({
        id: generateId(),
        category: 'milestone',
        title: 'Pipeline velocity is excellent',
        description: `Your pipeline velocity score is ${intelligence.data.pipelineVelocityScore}/100. Candidates are moving through stages efficiently.`,
        confidence: 85,
        timestamp: isoNow,
      });
    }

    // Competitor insight
    if (warRoom.competitorCount > 0) {
      proactiveInsights.push({
        id: generateId(),
        category: 'risk',
        title: `${warRoom.competitorCount} competitors actively hiring`,
        description: `Other companies are posting roles matching your open positions. Speed up screening to secure top talent.`,
        confidence: 75,
        actionLabel: 'View War Room',
        timestamp: isoNow,
      });
    }

    // Sort insights by timestamp (newest first)
    proactiveInsights.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // ══════════════════════════════════════════════════════════════
    // 5. THREAT SUMMARY
    // ══════════════════════════════════════════════════════════════
    const topThreats: string[] = [];
    if (warRoom.competitorCount >= 3) {
      topThreats.push(`${warRoom.competitorCount} competitors hiring similar roles`);
    }
    if (highFlightRisks.length > 0) {
      topThreats.push(`${highFlightRisks.length} high flight risk candidate${highFlightRisks.length > 1 ? 's' : ''}`);
    }
    if (warRoom.avgSalaryPressure > 2) {
      topThreats.push(`Salary pressure +${warRoom.avgSalaryPressure}%`);
    }
    if (criticalAlerts.length > 0) {
      topThreats.push(`${criticalAlerts.length} critical market alert${criticalAlerts.length > 1 ? 's' : ''}`);
    }

    const threatSummary: ThreatSummary = {
      overallLevel: warRoom.threatLevel,
      topThreats: topThreats.slice(0, 2),
      competitorCount: warRoom.competitorCount,
      flightRiskCount: warRoom.flightRiskCount,
    };

    return {
      prioritizedActions,
      bottlenecks,
      weeklyUpdate,
      proactiveInsights,
      threatSummary,
      isLoading,
      isError,
    };
  } catch {
    // Never crash
    return { ...DEFAULTS, isLoading: false, isError: false };
  }
}
