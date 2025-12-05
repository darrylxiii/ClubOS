// Analytics Type Definitions
// These types correspond to the materialized views and tables created in the database

export interface HiringMetrics {
  week: string;
  company_id: string;
  total_applications: number;
  hires: number;
  avg_days_to_hire: number;
  active_jobs: number;
  rejections: number;
  in_progress: number;
  avg_time_to_hire_days: number;
}

export interface RecruiterPerformance {
  user_id: string;
  company_id: string;
  recruiter_name: string;
  total_reviews: number;
  interviews_scheduled: number;
  hires_made: number;
  jobs_managed: number;
  avg_response_time_days: number;
  month: string;
}

export interface PipelineHealth {
  company_id: string;
  status: string;
  candidate_count: number;
  avg_days_in_stage: number;
  week: string;
}

export interface SavedReport {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  query_config: Record<string, any>;
  report_type: string;
  visualization_type: string;
  is_scheduled: boolean;
  schedule_cron: string | null;
  recipients: string[] | null;
  created_by: string;
  created_at: string;
  last_run_at: string | null;
}

export interface ReportExecution {
  id: string;
  report_id: string;
  executed_at: string;
  results: Record<string, any>;
  error: string | null;
}

export interface AnalyticsSnapshot {
  id: string;
  snapshot_date: string;
  company_id: string;
  metrics: Record<string, any>;
  created_at: string;
}

export interface ContinuousPipelineAnalytics {
  job_id: string;
  job_title: string;
  company_id: string;
  is_continuous: boolean;
  hired_count: number;
  target_hire_count: number | null;
  total_hires: number;
  avg_days_to_fill: number | null;
  total_revenue: number;
  avg_placement_fee: number | null;
  first_hire_date: string | null;
  latest_hire_date: string | null;
  avg_days_between_hires: number | null;
}

export interface ContinuousPipelineHire {
  id: string;
  job_id: string;
  application_id: string | null;
  candidate_id: string | null;
  hire_number: number;
  hired_at: string;
  actual_salary: number | null;
  placement_fee: number | null;
  days_to_fill: number | null;
  notes: string | null;
  created_at: string;
}

// Aggregated Hiring Intelligence Types
export interface AggregatedHiringInsights {
  overallHealth: {
    score: number;
    trend: 'improving' | 'stable' | 'declining' | 'needs_attention';
    summary: string;
  };
  crossPipelineInsights: {
    bottleneckPattern: string;
    topPerformer: string | null;
    concernAreas: string[];
    patterns: string[];
  };
  strategicRecommendations: Array<{
    priority: 'critical' | 'high' | 'medium';
    insight: string;
    impact: string;
  }>;
  portfolioForecast: {
    predictedHires30Days: number;
    predictedHires90Days: number;
    confidence: number;
    riskFactors: string[];
  };
  improvementOpportunities: Array<{
    area: string;
    currentState: string;
    recommendation: string;
    potentialGain: string;
  }>;
  metrics: {
    totalActiveJobs: number;
    totalApplications: number;
    totalInterviews: number;
    avgMatchScore: number;
    stageDistribution: Record<string, number>;
    standardPipelines: number;
    continuousPipelines: number;
  };
  jobHealthScores: Array<{
    jobId: string;
    title: string;
    score: number;
    appCount: number;
  }>;
}
