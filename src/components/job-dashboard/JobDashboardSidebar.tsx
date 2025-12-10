import { memo } from "react";
import { JobSummaryCard } from "./JobSummaryCard";
import { EnhancedStatsGrid } from "./EnhancedStatsGrid";
import { JobTeamPanel } from "@/components/partner/JobTeamPanel";
import { InlineDocumentsCard } from "./InlineDocumentsCard";
import { UpcomingInterviewsCompact } from "./UpcomingInterviewsCompact";
import { InlineActivityFeed } from "./InlineActivityFeed";
import { motion } from "framer-motion";

interface JobDashboardSidebarProps {
  job: any;
  metrics: {
    totalApplicants: number;
    stageBreakdown: { [key: number]: number };
    avgDaysInStage: { [key: number]: number };
    conversionRates: { [key: string]: number };
    needsClubCheck: number;
    lastActivity: string;
  } | null;
  stages: any[];
  onEditJob: () => void;
  onRefresh: () => void;
}

export const JobDashboardSidebar = memo(({
  job,
  metrics,
  stages,
  onEditJob,
  onRefresh
}: JobDashboardSidebarProps) => {
  // Calculate days open
  const daysOpen = job?.created_at 
    ? Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  // Calculate active candidates (not in first stage, not rejected)
  const activeCandidates = metrics 
    ? Object.entries(metrics.stageBreakdown)
        .filter(([key]) => parseInt(key) > 0)
        .reduce((sum, [_, count]) => sum + count, 0)
    : 0;
  
  // Calculate interviews this week (placeholder - would need interview data)
  const interviewsThisWeek = 0;
  
  // Calculate avg time to hire
  const avgTimeToHire = metrics 
    ? Object.values(metrics.avgDaysInStage).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <motion.div 
      className="space-y-4 lg:sticky lg:top-6 h-fit"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Job Summary - Always Visible */}
      <JobSummaryCard 
        job={job}
        onEdit={onEditJob}
      />
      
      {/* Enhanced Stats Grid - 6 KPIs */}
      <EnhancedStatsGrid
        totalApplicants={metrics?.totalApplicants || 0}
        activeCandidates={activeCandidates}
        interviewsThisWeek={interviewsThisWeek}
        daysOpen={daysOpen}
        conversionRate={metrics?.conversionRates?.['0-1'] || 0}
        avgTimeToHire={Math.round(avgTimeToHire)}
      />

      {/* Real Activity Feed (replaced mock CandidateEngagementStream) */}
      <InlineActivityFeed jobId={job.id} initialLimit={5} />

      
      {/* Team Panel - Compact */}
      <JobTeamPanel jobId={job.id} />
      
      {/* Documents Quick Access */}
      <InlineDocumentsCard jobId={job.id} />
      
      {/* Upcoming Interviews - Compact */}
      <UpcomingInterviewsCompact jobId={job.id} limit={3} />
    </motion.div>
  );
});

JobDashboardSidebar.displayName = 'JobDashboardSidebar';
