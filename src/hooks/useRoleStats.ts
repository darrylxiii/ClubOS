import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminStats {
  totalUsers: number;
  totalCompanies: number;
  totalJobs: number;
  pendingReviews: number;
}

interface PartnerStats {
  activeJobs: number;
  totalApplications: number;
  interviews: number;
  followers: number;
}

interface CandidateStats {
  applications: number;
  matches: number;
  interviews: number;
  messages: number;
}

type RoleStats = AdminStats | PartnerStats | CandidateStats;

export const useRoleStats = (role: string, userId?: string, companyId?: string) => {
  const [stats, setStats] = useState<RoleStats>({} as RoleStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        switch (role) {
          case 'admin':
            await fetchAdminStats();
            break;
          case 'partner':
            if (companyId) await fetchPartnerStats(companyId);
            break;
          case 'user':
          case 'strategist':
            if (userId) await fetchCandidateStats(userId);
            break;
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [role, userId, companyId]);

  const fetchAdminStats = async () => {
    const [usersRes, companiesRes, jobsRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
    ]);

    setStats({
      totalUsers: usersRes.count || 0,
      totalCompanies: companiesRes.count || 0,
      totalJobs: jobsRes.count || 0,
      pendingReviews: 0,
    });
  };

  const fetchPartnerStats = async (companyId: string) => {
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('company_id', companyId);

    const jobIds = jobs?.map(j => j.id) || [];

    const [jobsRes, followersRes, appsRes, meetingsRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'published'),
      supabase
        .from('company_followers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId),
      jobIds.length > 0
        ? supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .in('job_id', jobIds)
        : { count: 0 },
      supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled'),
    ]);

    setStats({
      activeJobs: jobsRes.count || 0,
      totalApplications: appsRes.count || 0,
      interviews: meetingsRes.count || 0,
      followers: followersRes.count || 0,
    });
  };

  const fetchCandidateStats = async (userId: string) => {
    const [appsRes, matchesRes, interviewsRes] = await Promise.all([
      supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', userId),
      supabase
        .from('match_scores')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('overall_score', 70),
      supabase
        .from('meeting_participants')
        .select('meeting_id, meetings!inner(scheduled_start)', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('meetings.scheduled_start', new Date().toISOString()),
    ]);

    setStats({
      applications: appsRes.count || 0,
      matches: matchesRes.count || 0,
      interviews: interviewsRes.count || 0,
      messages: 0,
    });
  };

  return { stats, loading };
};
