import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';

export interface ReviewJobSummary {
  jobId: string;
  jobTitle: string;
  companyName: string;
  companyId: string | null;
  pendingCount: number;
  oldestPendingAt: string | null;
  isOverdue: boolean;
}

export interface AggregatedReviewData {
  jobs: ReviewJobSummary[];
  totalPending: number;
  overdueCount: number;
  isLoading: boolean;
  isError: boolean;
}

const INTERNAL_SLA_HOURS = 24;
const PARTNER_SLA_HOURS = 48;

function isOverdueSLA(createdAt: string | null, slaHours: number): boolean {
  if (!createdAt) return false;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs > slaHours * 60 * 60 * 1000;
}

async function fetchAggregatedQueue(
  mode: 'internal' | 'partner',
  companyId?: string,
): Promise<ReviewJobSummary[]> {
  let query = supabase
    .from('applications')
    .select('id, job_id, created_at, internal_review_status, partner_review_status');

  if (mode === 'internal') {
    // Admins see candidates needing internal pre-vet
    query = query.or('internal_review_status.is.null,internal_review_status.eq.pending');
    query = query.neq('status', 'rejected');
  } else {
    // Partners see candidates that passed internal review
    query = query.eq('internal_review_status', 'approved');
    query = query.or('partner_review_status.is.null,partner_review_status.eq.pending');
    query = query.neq('status', 'rejected');
  }

  const { data: applications, error: appError } = await query;
  if (appError) throw appError;
  if (!applications || applications.length === 0) return [];

  // Get unique job IDs
  const jobIds = [...new Set(applications.map((a) => a.job_id))];

  // Fetch jobs with company info
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, title, company_id')
    .in('id', jobIds);

  if (jobsError) throw jobsError;

  // Filter by company if partner
  const filteredJobs = companyId
    ? (jobs || []).filter((j) => j.company_id === companyId)
    : jobs || [];

  const filteredJobIds = new Set(filteredJobs.map((j) => j.id));

  // Fetch company names
  const companyIds = [...new Set(filteredJobs.map((j) => j.company_id).filter(Boolean))] as string[];
  const { data: companies } = companyIds.length
    ? await supabase.from('companies').select('id, name').in('id', companyIds)
    : { data: [] };

  const companyMap = new Map((companies || []).map((c) => [c.id, c.name]));
  const jobMap = new Map(filteredJobs.map((j) => [j.id, j]));

  // Group applications by job
  const grouped = new Map<string, { count: number; oldest: string | null }>();
  for (const app of applications) {
    if (!filteredJobIds.has(app.job_id)) continue;
    const existing = grouped.get(app.job_id);
    if (existing) {
      existing.count += 1;
      if (!existing.oldest || app.created_at < existing.oldest) {
        existing.oldest = app.created_at;
      }
    } else {
      grouped.set(app.job_id, { count: 1, oldest: app.created_at });
    }
  }

  const slaHours = mode === 'internal' ? INTERNAL_SLA_HOURS : PARTNER_SLA_HOURS;

  return Array.from(grouped.entries())
    .map(([jobId, { count, oldest }]) => {
      const job = jobMap.get(jobId);
      return {
        jobId,
        jobTitle: job?.title || 'Untitled Role',
        companyName: job?.company_id ? companyMap.get(job.company_id) || 'Company' : 'Company',
        companyId: job?.company_id || null,
        pendingCount: count,
        oldestPendingAt: oldest,
        isOverdue: isOverdueSLA(oldest, slaHours),
      };
    })
    .sort((a, b) => {
      // Overdue first, then by count descending
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return b.pendingCount - a.pendingCount;
    });
}

export function useAggregatedReviewQueue(): AggregatedReviewData {
  const { currentRole, companyId } = useRole();
  const { user } = useAuth();

  const isAdmin = currentRole === 'admin' || currentRole === 'strategist';
  const isPartner = currentRole === 'partner';
  const mode = isAdmin ? 'internal' : 'partner';

  const query = useQuery({
    queryKey: ['aggregated-review-queue', mode, companyId],
    queryFn: () => fetchAggregatedQueue(mode, isPartner ? companyId || undefined : undefined),
    enabled: Boolean(user) && (isAdmin || isPartner),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const jobs = query.data ?? [];
  const totalPending = jobs.reduce((sum, j) => sum + j.pendingCount, 0);
  const overdueCount = jobs.filter((j) => j.isOverdue).length;

  return {
    jobs,
    totalPending,
    overdueCount,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
