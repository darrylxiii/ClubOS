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
