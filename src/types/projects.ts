// Club Projects: Type Definitions

export type FreelanceStatus = 'available' | 'busy' | 'not_accepting';
export type ProjectType = 'one-time' | 'recurring' | 'retainer';
export type EngagementType = 'hourly' | 'fixed' | 'milestone';
export type ExperienceLevel = 'junior' | 'mid' | 'senior' | 'expert';
export type ProjectStatus = 'draft' | 'open' | 'in_review' | 'active' | 'paused' | 'completed' | 'cancelled';
export type ProjectVisibility = 'public' | 'invite_only' | 'private';
export type ProposalType = 'club_ai' | 'invited' | 'manual';
export type ProposalStatus = 'draft' | 'submitted' | 'viewed' | 'shortlisted' | 'interviewing' | 'accepted' | 'rejected' | 'withdrawn';
export type ContractStatus = 'pending_signature' | 'active' | 'paused' | 'completed' | 'terminated' | 'disputed';
export type MilestoneStatus = 'pending' | 'in_progress' | 'submitted' | 'revision_requested' | 'approved' | 'paid';
export type TimeTrackingStatus = 'pending' | 'approved' | 'disputed' | 'invoiced' | 'paid';
export type ReviewType = 'client_to_freelancer' | 'freelancer_to_client';

export interface FreelanceProfile {
  id: string;
  freelance_status: FreelanceStatus;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  project_rate_preference: 'hourly' | 'fixed' | 'both' | null;
  availability_hours_per_week: number | null;
  available_from_date: string | null;
  categories: string[];
  portfolio_items: PortfolioItem[];
  years_freelancing: number | null;
  preferred_engagement_types: string[];
  preferred_industries: string[];
  total_completed_projects: number;
  total_project_earnings: number;
  avg_project_rating: number | null;
  completion_rate_percentage: number;
  avg_delivery_time_vs_estimate: number;
  active_projects_count: number;
  certifications: Record<string, unknown>[];
  timezone_preference: string | null;
  language_proficiencies: Record<string, unknown>[];
  is_open_to_retainers: boolean;
  min_project_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  url?: string;
  thumbnail?: string;
  tags: string[];
  completed_at?: string;
}

export interface Project {
  id: string;
  company_id: string | null;
  posted_by: string | null;
  title: string;
  description: string | null;
  detailed_scope: Record<string, unknown> | null;
  category: string | null;
  subcategory: string | null;
  skills_required: string[];
  experience_level: ExperienceLevel | null;
  project_type: ProjectType | null;
  engagement_type: EngagementType | null;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: string;
  estimated_hours: number | null;
  timeline_weeks: number | null;
  start_date_target: string | null;
  end_date_target: string | null;
  remote_policy: 'remote' | 'hybrid' | 'onsite' | null;
  timezone_requirement: string | null;
  deliverables: string[];
  success_criteria: string[];
  status: ProjectStatus;
  visibility: ProjectVisibility;
  priority_level: number;
  club_ai_match_enabled: boolean;
  auto_accept_proposals: boolean;
  requires_nda: boolean;
  requires_interview: boolean;
  max_proposals: number;
  proposal_deadline: string | null;
  view_count: number;
  application_count: number;
  assigned_freelancer_id: string | null;
  contract_id: string | null;
  related_job_id: string | null;
  crm_deal_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  closed_at: string | null;
}

export interface ProjectProposal {
  id: string;
  project_id: string;
  freelancer_id: string;
  cover_letter: string | null;
  proposal_type: ProposalType;
  proposed_rate: number | null;
  proposed_timeline_weeks: number | null;
  proposed_deliverables: string[];
  portfolio_highlights: Record<string, unknown>[];
  availability_statement: string | null;
  relevant_experience: Record<string, unknown>[];
  questions_for_client: string[];
  match_score: number | null;
  match_factors: Record<string, unknown> | null;
  match_explanation: string | null;
  status: ProposalStatus;
  club_ai_confidence: number | null;
  is_ai_generated: boolean;
  ai_generation_prompt: string | null;
  viewed_by_client_at: string | null;
  client_notes: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectContract {
  id: string;
  project_id: string;
  proposal_id: string | null;
  freelancer_id: string;
  company_id: string | null;
  contract_type: 'hourly' | 'fixed' | 'milestone' | 'retainer';
  hourly_rate: number | null;
  total_budget: number | null;
  currency: string;
  payment_schedule: 'weekly' | 'biweekly' | 'milestone' | 'upon_completion' | null;
  milestones: Record<string, unknown>[];
  payment_terms: Record<string, unknown> | null;
  start_date: string | null;
  end_date: string | null;
  actual_end_date: string | null;
  contract_status: ContractStatus;
  signed_by_freelancer: boolean;
  freelancer_signed_at: string | null;
  signed_by_client: boolean;
  client_signed_at: string | null;
  contract_document_url: string | null;
  escrow_enabled: boolean;
  escrow_amount: number | null;
  escrow_status: 'pending' | 'funded' | 'released' | 'refunded' | null;
  platform_fee_percentage: number;
  platform_fee_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMilestone {
  id: string;
  contract_id: string;
  milestone_number: number;
  title: string;
  description: string | null;
  deliverable_description: string | null;
  amount: number;
  due_date: string | null;
  status: MilestoneStatus;
  started_at: string | null;
  submitted_at: string | null;
  submitted_files: Record<string, unknown>[];
  revision_count: number;
  approved_at: string | null;
  paid_at: string | null;
  feedback_from_client: string | null;
  feedback_rating: number | null;
  time_spent_hours: number | null;
  estimated_hours: number | null;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  contract_id: string;
  freelancer_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  hours_worked: number;
  hourly_rate: number;
  total_amount: number;
  task_description: string | null;
  is_billable: boolean;
  status: TimeTrackingStatus;
  approved_at: string | null;
  tags: string[];
  created_at: string;
}

export interface ProjectReview {
  id: string;
  project_id: string;
  contract_id: string;
  reviewer_id: string;
  reviewee_id: string;
  review_type: ReviewType;
  overall_rating: number;
  review_text: string | null;
  communication_rating: number | null;
  professionalism_rating: number | null;
  quality_rating: number | null;
  timeliness_rating: number | null;
  would_work_again: boolean | null;
  project_highlights: string[];
  is_public: boolean;
  created_at: string;
}

export interface FreelancerMatch {
  freelancer_id: string;
  profile: FreelanceProfile;
  match_score: number;
  match_factors: {
    skillsOverlap: number;
    experienceMatch: number;
    budgetFit: number;
    availabilityMatch: number;
    timezoneMatch: number;
    ratingScore: number;
    completionRate: number;
  };
  match_explanation: string;
  portfolio_highlights: PortfolioItem[];
  estimated_response_time: string;
  risk_level: 'low' | 'medium' | 'higher';
}
