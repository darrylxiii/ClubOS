/**
 * Shared TypeScript interfaces for job-related entities
 */

export interface JobBase {
  id: string;
  title: string;
  status: string;
  location?: string | null;
  employment_type?: string | null;
  location_type?: string | null;
  created_at: string;
  updated_at?: string | null;
  company_id?: string | null;
}

export interface JobWithSalary extends JobBase {
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string | null;
}

export interface JobWithContinuous extends JobWithSalary {
  is_continuous?: boolean | null;
  hired_count?: number | null;
  target_hire_count?: number | null;
}

export interface JobWithMetrics extends JobWithContinuous {
  applications_count?: number | null;
  views_count?: number | null;
  club_sync_enabled?: boolean | null;
  club_sync_status?: string | null;
  last_activity_at?: string | null;
}

export interface JobWithCompany extends JobWithMetrics {
  companies?: {
    id?: string;
    name: string;
    slug?: string | null;
    logo_url?: string | null;
    cover_image_url?: string | null;
    tagline?: string | null;
    description?: string | null;
    industry?: string | null;
    company_size?: string | null;
    headquarters_location?: string | null;
    website_url?: string | null;
  } | null;
}

export interface JobFull extends JobWithCompany {
  description?: string | null;
  requirements?: string[] | null;
  nice_to_have?: string[] | null;
  responsibilities?: string[] | null;
  benefits?: string[] | null;
  experience_level?: string | null;
  seniority_level?: string | null;
  department?: string | null;
  external_url?: string | null;
  job_description_url?: string | null;
  pipeline_stages?: PipelineStage[] | null;
  match_score?: number | null;
  is_stealth?: boolean | null;
  show_referral_bonus?: boolean | null;
  referral_bonus_percentage?: number | null;
}

export interface PipelineStage {
  id?: string;
  name: string;
  order: number;
  description?: string | null;
  duration_minutes?: number | null;
  format?: string | null;
  owner?: string | null;
  resources?: string[] | null;
  location?: string | null;
  meeting_link?: string | null;
}

export interface CandidateJobView {
  id: string;
  title: string;
  company: string;
  companyLogo?: string | null;
  companySlug?: string | null;
  location: string;
  type: string;
  postedDate: string;
  status?: 'applied' | 'screening' | 'interview' | 'offer' | 'rejected';
  tags: string[];
  salary?: string | null;
  matchScore?: number;
  isSaved?: boolean;
  isContinuous?: boolean;
  hiredCount?: number;
  targetHireCount?: number | null;
}

export interface PartnerJobView extends JobWithMetrics {
  company_name?: string;
  company_logo?: string | null;
  conversion_rate?: number;
  avg_days_in_pipeline?: number;
  urgency_level?: 'critical' | 'high' | 'medium' | 'low' | 'none';
}

export interface JobDashboardMetrics {
  totalApplicants: number;
  stageBreakdown: Record<number, number>;
  avgDaysInStage: Record<number, number>;
  conversionRates: Record<string, number>;
  needsClubCheck: number;
  lastActivity: string;
}

export interface JobFilters {
  status?: string[];
  location?: string[];
  employmentType?: string[];
  salaryMin?: number;
  salaryMax?: number;
  search?: string;
  sortBy?: 'created_at' | 'updated_at' | 'applications_count' | 'title';
  sortOrder?: 'asc' | 'desc';
}
