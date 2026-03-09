import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface HiringStats {
  activeJobs: number;
  totalJobs?: number;
  aiInsightsGenerated: number;
  predictedHires: number;
  avgMatchScore: number;
  jobsWithCandidates?: number;
  totalCandidates?: number;
}

interface JobWithHealth {
  id: string;
  title: string;
  status: string;
  created_at: string;
  company_id: string | null;
  companies: { name: string } | null;
  candidatesInPipeline: number;
  upcomingInterviews: number;
  healthScore: number;
  alerts: number;
  [key: string]: unknown;
}

interface CandidateApplication {
  id: string;
  job_id: string;
  candidate_id: string;
  status: string;
  match_score: number | null;
  candidate_profiles: { full_name: string | null } | null;
  jobs: { title: string; companies: { name: string } | null } | null;
  [key: string]: unknown;
}

interface UpcomingInterview {
  id: string;
  scheduled_start: string;
  scheduled_end: string | null;
  meeting_type?: string;
  candidate_profiles: { full_name: string | null } | null;
  jobs: { title: string; companies: { name: string } | null } | null;
  [key: string]: unknown;
}

interface InterviewStats {
  thisWeek: number;
  feedbackPending: number;
  avgFeedbackTime: number;
}

interface HiringIntelligenceResult {
  stats: HiringStats;
  jobs: JobWithHealth[];
  jobsNeedingAttention: JobWithHealth[];
  topCandidates: CandidateApplication[];
  upcomingInterviews: UpcomingInterview[];
  interviewStats: InterviewStats;
}

async function fetchHiringIntelligence(): Promise<HiringIntelligenceResult> {
  // Parallel fetch all data
  const [jobsRes, applicationsRes, interviewsRes, predictionsRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('*, companies(name)')
      .in('status', ['published', 'draft'])
      .order('created_at', { ascending: false }),
    supabase
      .from('applications')
      .select('*, candidate_profiles(full_name), jobs(title, companies(name))')
      .in('status', ['active', 'screening', 'interview', 'offer'])
      .order('match_score', { ascending: false, nullsFirst: false })
      .limit(20),
    supabase
      .from('bookings')
      .select('*, candidate_profiles(full_name), jobs(title, companies(name))')
      .or('is_interview_booking.eq.true,job_id.not.is.null')
      .gte('scheduled_start', new Date().toISOString())
      .order('scheduled_start', { ascending: true })
      .limit(10),
    supabase
      .from('ml_predictions')
      .select('prediction_score')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (jobsRes.error) throw jobsRes.error;

  const jobsData = jobsRes.data || [];
  const applications = applicationsRes.data || [];
  const interviews = interviewsRes.data || [];
  const predictions = predictionsRes.data || [];

  // Load application counts per job
  const jobIds = jobsData.map(j => j.id);
  const applicationCounts: Record<string, number> = {};

  if (jobIds.length > 0) {
    const { data: appCountData } = await supabase
      .from('applications')
      .select('job_id')
      .in('job_id', jobIds);

    appCountData?.forEach(app => {
      applicationCounts[app.job_id] = (applicationCounts[app.job_id] || 0) + 1;
    });
  }

  // Calculate stats
  const applicationsWithScores = applications.filter(a => a.match_score != null);
  const avgMatchScore = applicationsWithScores.length > 0
    ? Math.round(applicationsWithScores.reduce((sum, a) => sum + (a.match_score || 0), 0) / applicationsWithScores.length)
    : 0;

  const activeJobs = jobsData.filter(j => j.status === 'published').length;
  const candidatesInPipeline = applications.length;

  const stats: HiringStats = {
    activeJobs,
    totalJobs: jobsData.length,
    aiInsightsGenerated: predictions.length,
    predictedHires: candidatesInPipeline > 0 ? Math.ceil(candidatesInPipeline * 0.15) : 0,
    avgMatchScore,
    jobsWithCandidates: Object.keys(applicationCounts).length,
    totalCandidates: candidatesInPipeline,
  };

  const jobs: JobWithHealth[] = jobsData.map((job) => {
    const appCount = applicationCounts[job.id] || 0;
    let healthScore = 0;
    if (job.status === 'published') {
      healthScore = appCount > 10 ? 100 : appCount > 5 ? 80 : appCount > 2 ? 60 : appCount > 0 ? 40 : 20;
    } else {
      healthScore = 10;
    }

    return {
      ...job,
      companies: job.companies as { name: string } | null,
      candidatesInPipeline: appCount,
      upcomingInterviews: 0,
      healthScore,
      alerts: healthScore < 50 ? 1 : 0,
    };
  });

  return {
    stats,
    jobs,
    jobsNeedingAttention: jobs.filter(j => j.healthScore < 60 && j.status === 'published'),
    topCandidates: applications.slice(0, 6) as unknown as CandidateApplication[],
    upcomingInterviews: interviews as unknown as UpcomingInterview[],
    interviewStats: {
      thisWeek: interviews.length,
      feedbackPending: 0,
      avgFeedbackTime: 12,
    },
  };
}

export function useHiringIntelligenceData() {
  return useQuery({
    queryKey: ['hiring-intelligence'],
    queryFn: fetchHiringIntelligence,
    staleTime: 60_000,
  });
}

export type {
  HiringStats,
  JobWithHealth,
  CandidateApplication,
  UpcomingInterview,
  InterviewStats,
};
