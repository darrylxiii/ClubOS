import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type JobRow = Database['public']['Tables']['jobs']['Row'];

export interface PipelineStage {
  name: string;
  order: number;
  description?: string;
  owner?: string;
  owner_role?: string;
  owner_avatar?: string;
  format?: string;
  duration?: string;
  location?: string;
  resources?: string[];
  scheduled_date?: string;
  is_club_stage?: boolean;
  auto_advance?: boolean;
  stage_type?: string;
}

export interface JobCompany {
  id: string;
  name: string;
  logo_url: string | null;
  placement_fee_percentage: number | null;
  fee_type: string | null;
  placement_fee_fixed: number | null;
}

export interface JobToolEntry {
  id: string;
  is_required: boolean | null;
  proficiency_level: string | null;
  tools_and_skills: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    category: string | null;
  } | null;
}

export interface JobDashboardJob extends JobRow {
  companies: JobCompany | null;
  job_tools: JobToolEntry[];
}

export interface EnrichedApplication {
  id: string;
  job_id: string;
  user_id: string | null;
  candidate_id: string | null;
  status: string;
  current_stage_index: number;
  applied_at: string;
  updated_at: string;
  match_score: number | null;
  internal_review_status: string | null;
  partner_review_status: string | null;
  stages: unknown[];
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  current_title: string | null;
  current_company: string | null;
  linkedin_url: string | null;
  is_linked_user: boolean;
}

export interface JobMetrics {
  totalApplicants: number;
  stageBreakdown: Record<number, number>;
  avgDaysInStage: Record<number, number>;
  conversionRates: Record<string, number>;
  needsClubCheck: number;
  lastActivity: string;
}

export function useJobDashboardData(jobId: string | undefined, role: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['job-dashboard', jobId],
    queryFn: async () => {
      if (!jobId) throw new Error('No job ID');

      // Fetch job details
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          companies (id, name, logo_url, placement_fee_percentage, fee_type, placement_fee_fixed),
          job_tools (id, is_required, proficiency_level, tools_and_skills (id, name, slug, logo_url, category))
        `)
        .eq('id', jobId)
        .single();

      if (error) throw error;
      const job = data as unknown as JobDashboardJob;

      // Log job view (once per session)
      const sessionKey = `job_view_logged_${jobId}`;
      if (!sessionStorage.getItem(sessionKey)) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: viewerProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

          await supabase.from('pipeline_audit_logs').insert({
            job_id: jobId,
            user_id: user.id,
            action: 'job_viewed',
            stage_data: { page: 'dashboard', view_timestamp: new Date().toISOString() },
            metadata: {
              referrer: document.referrer || 'direct',
              user_agent: navigator.userAgent.substring(0, 200),
              viewer_role: role,
              viewer_name: viewerProfile?.full_name || 'Unknown',
            },
          });
          sessionStorage.setItem(sessionKey, 'true');
        }
      }

      // Fetch applications
      const stages: PipelineStage[] = Array.isArray(job.pipeline_stages) ? (job.pipeline_stages as PipelineStage[]) : [];
      const { applications, metrics } = await fetchApplicationsForMetrics(jobId, stages);

      // Fetch rejected count
      const { count } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', jobId)
        .eq('status', 'rejected');

      // Fetch active share count
      const { count: shareCount } = await (supabase as any)
        .from('job_pipeline_shares')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', jobId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

      return {
        job,
        applications,
        metrics,
        rejectedCount: count || 0,
        activeShareCount: shareCount ?? 0,
      };
    },
    enabled: !!jobId,
    staleTime: 30_000,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['job-dashboard', jobId] });
  };

  return {
    job: query.data?.job ?? null,
    applications: query.data?.applications ?? [],
    metrics: query.data?.metrics ?? null,
    rejectedCount: query.data?.rejectedCount ?? 0,
    activeShareCount: query.data?.activeShareCount ?? 0,
    loading: query.isLoading,
    refetch,
  };
}

async function fetchApplicationsForMetrics(
  jobId: string,
  stages: PipelineStage[]
): Promise<{ applications: EnrichedApplication[]; metrics: JobMetrics }> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('job_id', jobId)
    .neq('status', 'rejected');

  if (error) throw error;
  const apps = data || [];

  const candidateIds = [...new Set(apps.map(a => a.candidate_id).filter(Boolean))] as string[];
  const userIds = [...new Set(apps.map(a => a.user_id).filter(Boolean))] as string[];

  const [candidateProfilesResult, profilesResult] = await Promise.all([
    candidateIds.length > 0
      ? supabase
          .from('candidate_profiles')
          .select('id, user_id, full_name, email, phone, avatar_url, current_title, current_company, linkedin_url')
          .in('id', candidateIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length > 0
      ? supabase.from('profiles').select('id, full_name, email, phone, avatar_url').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const candidateProfilesMap = new Map<string, Record<string, unknown>>();
  (candidateProfilesResult.data || []).forEach((cp) => candidateProfilesMap.set(cp.id, cp));

  const profilesMap = new Map<string, Record<string, unknown>>();
  (profilesResult.data || []).forEach((p) => profilesMap.set(p.id, p));

  const additionalUserIds = (candidateProfilesResult.data || [])
    .map((cp) => cp.user_id)
    .filter((uid): uid is string => !!uid && !profilesMap.has(uid));

  if (additionalUserIds.length > 0) {
    const { data: additionalProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, avatar_url')
      .in('id', additionalUserIds);
    (additionalProfiles || []).forEach((p) => profilesMap.set(p.id, p));
  }

  const enrichedApps: EnrichedApplication[] = apps.map((app) => {
    let profileData: Record<string, unknown> | null = null;
    let linkedUserId = app.user_id;
    const candidateIdToUse = app.candidate_id;

    if (app.candidate_id && candidateProfilesMap.has(app.candidate_id)) {
      const cp = candidateProfilesMap.get(app.candidate_id)!;
      profileData = { ...cp };
      if (cp.user_id) {
        linkedUserId = cp.user_id as string;
        const userProfile = profilesMap.get(cp.user_id as string);
        if (userProfile?.avatar_url) profileData.avatar_url = userProfile.avatar_url;
      }
    }

    if (!profileData && app.user_id) {
      profileData = profilesMap.get(app.user_id) || null;
    }

    return {
      ...app,
      candidate_id: candidateIdToUse,
      full_name: (profileData?.full_name as string) || 'Candidate',
      email: (profileData?.email as string) || null,
      phone: (profileData?.phone as string) || null,
      avatar_url: (profileData?.avatar_url as string) || null,
      current_title: (profileData?.current_title as string) || null,
      current_company: (profileData?.current_company as string) || null,
      linkedin_url: (profileData?.linkedin_url as string) || null,
      user_id: linkedUserId,
      stages: app.stages || [],
      is_linked_user: !!(profileData as Record<string, unknown>)?.user_id,
    };
  });

  // Calculate metrics
  const stageBreakdown: Record<number, number> = {};
  const stageDurations: Record<number, number[]> = {};
  stages.forEach(stage => {
    stageBreakdown[stage.order] = 0;
    stageDurations[stage.order] = [];
  });

  enrichedApps.forEach(app => {
    if (app.current_stage_index !== undefined) {
      stageBreakdown[app.current_stage_index] = (stageBreakdown[app.current_stage_index] || 0) + 1;
      const appliedDate = new Date(app.updated_at || app.applied_at);
      const daysSince = Math.floor((Date.now() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
      if (stageDurations[app.current_stage_index]) stageDurations[app.current_stage_index].push(daysSince);
    }
  });

  const avgDaysInStage: Record<number, number> = {};
  Object.keys(stageDurations).forEach(key => {
    const durations = stageDurations[Number(key)];
    avgDaysInStage[Number(key)] = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;
  });

  const conversionRates: Record<string, number> = {};
  for (let i = 0; i < stages.length - 1; i++) {
    const reachedStage = enrichedApps.filter(app => app.current_stage_index >= i).length;
    const passedStage = enrichedApps.filter(app => app.current_stage_index > i).length;
    conversionRates[`${i}-${i + 1}`] = reachedStage > 0 ? Math.round((passedStage / reachedStage) * 100) : 0;
  }

  const lastApp = [...enrichedApps].sort((a, b) =>
    new Date(b.updated_at || b.applied_at).getTime() - new Date(a.updated_at || a.applied_at).getTime()
  )[0];

  const lastActivity = lastApp
    ? `${Math.floor((Date.now() - new Date(lastApp.updated_at || lastApp.applied_at).getTime()) / (1000 * 60 * 60))}h ago`
    : 'No activity yet';

  const needsClubCheck = enrichedApps.filter(
    app => app.current_stage_index === 0 && app.status === 'applied'
  ).length;

  return {
    applications: enrichedApps,
    metrics: { totalApplicants: enrichedApps.length, stageBreakdown, avgDaysInStage, conversionRates, needsClubCheck, lastActivity },
  };
}
