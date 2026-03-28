import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';

interface PartnerGreetingContext {
  pendingReviews: number;
  todayInterviews: number;
  activeJobs: number;
  loading: boolean;
}

const DEFAULTS: PartnerGreetingContext = {
  pendingReviews: 0,
  todayInterviews: 0,
  activeJobs: 0,
  loading: false,
};

/**
 * Lightweight context for the partner header greeting.
 * Only fires queries when the current role is 'partner' and companyId exists.
 */
export function usePartnerGreetingContext(role?: string): PartnerGreetingContext {
  const { companyId } = useRole();
  const { user } = useAuth();

  const isPartner = role === 'partner';

  const { data, isLoading } = useQuery({
    queryKey: ['partner-greeting-context', companyId],
    queryFn: async () => {
      if (!companyId) return DEFAULTS;

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Fetch jobs for this company + today's meetings for this user in parallel
        const [jobsRes, interviewsRes] = await Promise.all([
          supabase
            .from('jobs')
            .select('id, status')
            .eq('company_id', companyId),
          supabase
            .from('meetings')
            .select('id', { count: 'exact', head: true })
            .gte('scheduled_at', today.toISOString())
            .lt('scheduled_at', tomorrow.toISOString())
            .or(`organizer_id.eq.${user?.id},participant_ids.cs.{${user?.id}}`),
        ]);

        const jobs = jobsRes.data || [];
        const activeJobs = jobs.filter(j => j.status === 'published').length;
        const jobIds = jobs.map(j => j.id);

        // Sequential: fetch pending reviews only for this company's jobs
        let pendingReviews = 0;
        if (jobIds.length > 0) {
          const { count } = await supabase
            .from('applications')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending_review')
            .in('job_id', jobIds);
          pendingReviews = count || 0;
        }

        return {
          pendingReviews,
          todayInterviews: interviewsRes.count || 0,
          activeJobs,
          loading: false,
        };
      } catch {
        // Graceful fallback — don't crash the header
        return DEFAULTS;
      }
    },
    enabled: isPartner && !!companyId && !!user,
    staleTime: 120000, // 2 min — header doesn't need aggressive refresh
  });

  if (!isPartner) return DEFAULTS;

  return {
    pendingReviews: data?.pendingReviews ?? 0,
    todayInterviews: data?.todayInterviews ?? 0,
    activeJobs: data?.activeJobs ?? 0,
    loading: isLoading,
  };
}
