import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SilverMedalist {
  id: string;
  candidateId: string;
  candidateName: string;
  avatarUrl: string | null;
  email: string | null;
  originalRole: string;
  originalJobId: string;
  rejectionStage: string;
  scorecardRating: number | null;
  rejectedAt: string;
  lastActivityDate: string;
  activityStatus: 'profile_updated' | 'applied_elsewhere' | 'inactive';
}

export interface ReengagementSignal {
  id: string;
  candidateId: string;
  candidateName: string;
  avatarUrl: string | null;
  signalType: 'profile_update' | 'new_application' | 'linkedin_activity';
  timestamp: string;
  description: string;
  signalCount: number;
}

interface NurturingSequenceResult {
  silverMedalists: SilverMedalist[];
  reengagementSignals: ReengagementSignal[];
  poolSize: number;
  reengagedThisMonth: number;
  conversionRate: number;
  isLoading: boolean;
}

/**
 * Fetches "silver medalists" — candidates rejected at final stages (interview/offer)
 * for this company — and tracks re-engagement signals across the talent pool.
 */
export function useNurturingSequence(companyId: string | undefined): NurturingSequenceResult {
  const { data, isLoading } = useQuery({
    queryKey: ['nurturing-sequence', companyId],
    enabled: !!companyId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!companyId) {
        return { silverMedalists: [], reengagementSignals: [], poolSize: 0, reengagedThisMonth: 0, conversionRate: 0 };
      }

      const medalists: SilverMedalist[] = [];
      const signals: ReengagementSignal[] = [];

      try {
        // ── Fetch rejected applications at final stages ────────────
        const { data: rejectedApps } = await (supabase as any)
          .from('applications')
          .select('id, candidate_id, status, current_stage, updated_at, created_at, job_id, jobs!inner(title, company_id)')
          .eq('jobs.company_id', companyId)
          .eq('status', 'rejected')
          .in('current_stage', ['interview', 'final_interview', 'offer', 'reference_check', 'technical_interview'])
          .order('updated_at', { ascending: false })
          .limit(100);

        if (!rejectedApps || rejectedApps.length === 0) {
          return { silverMedalists: [], reengagementSignals: [], poolSize: 0, reengagedThisMonth: 0, conversionRate: 0 };
        }

        const candidateIds = [...new Set((rejectedApps as any[]).map((a) => a.candidate_id))] as string[];

        // ── Fetch profiles for those candidates ───────────────────
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, avatar_url, email, updated_at')
          .in('id', candidateIds);

        const profileMap = new Map(
          (profiles || []).map((p: any) => [p.id, p]),
        );

        // ── Fetch scorecards for those candidates ─────────────────
        const { data: scorecards } = await (supabase as any)
          .from('candidate_scorecards')
          .select('candidate_id, overall_rating')
          .in('candidate_id', candidateIds);

        const scorecardMap = new Map<string, number>();
        for (const sc of scorecards || []) {
          const existing = scorecardMap.get(sc.candidate_id);
          if (!existing || sc.overall_rating > existing) {
            scorecardMap.set(sc.candidate_id, sc.overall_rating);
          }
        }

        // ── Detect re-engagement: new applications to OTHER roles ──
        const { data: otherApps } = await (supabase as any)
          .from('applications')
          .select('id, candidate_id, status, created_at, job_id, jobs!inner(title, company_id)')
          .eq('jobs.company_id', companyId)
          .in('candidate_id', candidateIds)
          .neq('status', 'rejected')
          .order('created_at', { ascending: false })
          .limit(200);

        const newAppCandidates = new Set(
          (otherApps || []).map((a: any) => a.candidate_id),
        );

        // ── Build silver medalists list ───────────────────────────
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 86400000;

        for (const app of rejectedApps as any[]) {
          const profile = profileMap.get(app.candidate_id) as any;
          if (!profile) continue;

          const profileUpdated = profile.updated_at
            ? new Date(profile.updated_at).getTime() > new Date(app.updated_at).getTime()
            : false;

          let activityStatus: SilverMedalist['activityStatus'] = 'inactive';
          if (newAppCandidates.has(app.candidate_id)) {
            activityStatus = 'applied_elsewhere';
          } else if (profileUpdated) {
            activityStatus = 'profile_updated';
          }

          const lastActivity = activityStatus === 'applied_elsewhere'
            ? (otherApps || []).find((o: any) => o.candidate_id === app.candidate_id)?.created_at || app.updated_at
            : activityStatus === 'profile_updated'
            ? profile.updated_at
            : app.updated_at;

          medalists.push({
            id: app.id,
            candidateId: app.candidate_id,
            candidateName: profile.full_name || 'Unknown',
            avatarUrl: profile.avatar_url,
            email: profile.email,
            originalRole: (app as any).jobs?.title || 'Unknown Role',
            originalJobId: app.job_id,
            rejectionStage: app.current_stage,
            scorecardRating: scorecardMap.get(app.candidate_id) ?? null,
            rejectedAt: app.updated_at,
            lastActivityDate: lastActivity,
            activityStatus,
          });
        }

        // ── Build re-engagement signals ───────────────────────────
        const signalCounts = new Map<string, number>();

        for (const medalist of medalists) {
          if (medalist.activityStatus === 'inactive') continue;

          const count = signalCounts.get(medalist.candidateId) || 0;

          if (medalist.activityStatus === 'profile_updated') {
            signalCounts.set(medalist.candidateId, count + 1);
            signals.push({
              id: `signal-profile-${medalist.id}`,
              candidateId: medalist.candidateId,
              candidateName: medalist.candidateName,
              avatarUrl: medalist.avatarUrl,
              signalType: 'profile_update',
              timestamp: medalist.lastActivityDate,
              description: `Updated their profile after rejection from ${medalist.originalRole}`,
              signalCount: count + 1,
            });
          }

          if (medalist.activityStatus === 'applied_elsewhere') {
            signalCounts.set(medalist.candidateId, count + 1);
            signals.push({
              id: `signal-app-${medalist.id}`,
              candidateId: medalist.candidateId,
              candidateName: medalist.candidateName,
              avatarUrl: medalist.avatarUrl,
              signalType: 'new_application',
              timestamp: medalist.lastActivityDate,
              description: `Applied to another role after rejection from ${medalist.originalRole}`,
              signalCount: count + 1,
            });
          }
        }

        // Update signal counts for "hot" detection
        for (const signal of signals) {
          signal.signalCount = signalCounts.get(signal.candidateId) || 1;
        }

        // ── Compute summary metrics ──────────────────────────────
        const reengagedThisMonth = medalists.filter(
          (m) => m.activityStatus !== 'inactive' && new Date(m.lastActivityDate).getTime() > thirtyDaysAgo,
        ).length;

        const conversionRate = medalists.length > 0
          ? Math.round((reengagedThisMonth / medalists.length) * 100)
          : 0;

        return {
          silverMedalists: medalists,
          reengagementSignals: signals.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          ),
          poolSize: medalists.length,
          reengagedThisMonth,
          conversionRate,
        };
      } catch (err) {
        console.error('[useNurturingSequence] Error:', err);
        return { silverMedalists: [], reengagementSignals: [], poolSize: 0, reengagedThisMonth: 0, conversionRate: 0 };
      }
    },
  });

  return {
    silverMedalists: data?.silverMedalists ?? [],
    reengagementSignals: data?.reengagementSignals ?? [],
    poolSize: data?.poolSize ?? 0,
    reengagedThisMonth: data?.reengagedThisMonth ?? 0,
    conversionRate: data?.conversionRate ?? 0,
    isLoading,
  };
}
