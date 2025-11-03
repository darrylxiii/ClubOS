import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ApplicationData {
  id: string;
  job_id: string;
  user_id: string;
  company_name: string;
  position: string;
  current_stage_index: number;
  stages: any[];
  status: string;
  applied_at: string;
  job: {
    title: string;
    location: string;
    salary_min?: number;
    salary_max?: number;
    currency?: string;
    company_id: string;
    pipeline_stages: any;
    companies: {
      name: string;
      logo_url: string;
    };
  };
  other_candidates_count: number;
  talent_strategist?: {
    id: string;
    full_name: string;
    avatar_url: string;
    user_id: string;
  };
}

async function fetchApplicationsOptimized(userId: string): Promise<ApplicationData[]> {
  // Single optimized query with all joins
  const { data, error } = await supabase
    .from("applications")
    .select(`
      *,
      jobs!applications_job_id_fkey (
        id,
        title,
        location,
        salary_min,
        salary_max,
        currency,
        pipeline_stages,
        company_id,
        companies!jobs_company_id_fkey (
          name,
          logo_url
        )
      )
    `)
    .eq("user_id", userId)
    .order("applied_at", { ascending: false });

  if (error) throw error;

  // Get company members separately to avoid join issues
  const companyIds = [...new Set(data?.map(a => a.jobs?.company_id).filter(Boolean))] as string[];
  const { data: companyMembers } = await supabase
    .from("company_members")
    .select("company_id, user_id, role, is_active, created_at")
    .in("company_id", companyIds)
    .eq("is_active", true)
    .in("role", ["recruiter", "admin"]);

  // Get profiles for company members
  const memberUserIds = [...new Set(companyMembers?.map(m => m.user_id) || [])];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", memberUserIds);

  // Get candidate counts in ONE query
  const jobIds = data?.map(a => a.job_id) || [];
  const { data: allApplications } = await supabase
    .from("applications")
    .select("job_id, user_id")
    .in("job_id", jobIds);

  const countsByJob = (allApplications || []).reduce((acc, curr) => {
    if (curr.user_id !== userId) {
      acc[curr.job_id] = (acc[curr.job_id] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Transform data
  return (data || []).map((app) => {
    // Find strategist from company members
    let strategist = null;
    if (app.jobs?.company_id) {
      const memberForCompany = companyMembers
        ?.filter(m => m.company_id === app.jobs.company_id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

      if (memberForCompany) {
        const profile = profiles?.find(p => p.id === memberForCompany.user_id);
        if (profile) {
          strategist = {
            id: profile.id,
            full_name: profile.full_name || '',
            avatar_url: profile.avatar_url || '',
            user_id: memberForCompany.user_id
          };
        }
      }
    }

    // Format pipeline stages
    const jobPipelineStages = app.jobs?.pipeline_stages || [];
    const formattedStages = Array.isArray(jobPipelineStages) 
      ? jobPipelineStages.map((stage: any) => ({
          id: stage.id || String(stage.order),
          title: stage.name,
          description: stage.description,
          status: "upcoming" as const,
          preparation: stage.resources ? {
            title: "Preparation Guide",
            content: stage.description || "",
            resources: stage.resources
          } : undefined,
          scheduledDate: stage.scheduled_date,
          duration: stage.duration,
          location: stage.location,
          meetingType: stage.format,
          interviewers: stage.owner ? [{
            name: stage.owner,
            title: stage.owner_role || "Interviewer",
            photo: stage.owner_avatar
          }] : undefined,
        }))
      : [];

    return {
      ...app,
      job: app.jobs,
      stages: formattedStages,
      other_candidates_count: countsByJob[app.job_id] || 0,
      talent_strategist: strategist,
    };
  });
}

export function useApplications(userId: string | undefined) {
  return useQuery({
    queryKey: ['applications', userId],
    queryFn: () => fetchApplicationsOptimized(userId!),
    staleTime: 60000, // Cache for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes
    enabled: !!userId,
  });
}
