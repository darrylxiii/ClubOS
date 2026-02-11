export interface CRMContact {
  id: string;
  profile_id: string;
  company_id: string | null;
  contact_type: 'candidate' | 'partner' | 'strategist' | 'external';
  lifecycle_stage: 'lead' | 'qualified' | 'active' | 'inactive' | 'churned' | null;
  lead_score: number;
  engagement_score: number;
  tags: string[];
  custom_fields: Record<string, unknown>;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  
  // From joined profiles table
  full_name?: string;
  email?: string;
  avatar_url?: string;
  
  // From joined companies table
  company_name?: string;
}

export interface CRMDeal {
  id: string;
  deal_type: 'job_opening' | 'candidate_placement' | 'partner_contract' | 'custom';
  job_id: string | null;
  application_id: string | null;
  company_id: string | null;
  title: string;
  description: string | null;
  value: number | null;
  currency: string;
  stage: string;
  probability: number | null;
  close_date: string | null;
  owner_id: string | null;
  source: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  
  // Joined data
  company_name?: string;
  owner_name?: string;
}

export interface CRMActivity {
  id: string;
  activity_type: 'email' | 'call' | 'meeting' | 'message' | 'task' | 'note' | 'assessment';
  contact_id: string | null;
  deal_id: string | null;
  company_id: string | null;
  message_id: string | null;
  meeting_id: string | null;
  task_id: string | null;
  assessment_id: string | null;
  subject: string | null;
  description: string | null;
  outcome: string | null;
  direction: 'inbound' | 'outbound' | null;
  duration_minutes: number | null;
  created_by: string | null;
  participants: string[];
  metadata: Record<string, unknown>;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  
  // Joined data
  creator_name?: string;
  creator_avatar?: string;
  contact_name?: string;
  deal_title?: string;
}

export interface CRMPipeline {
  id: string;
  name: string;
  pipeline_type: 'hiring' | 'sales' | 'partner_onboarding' | 'custom';
  company_id: string | null;
  stages: PipelineStage[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  name: string;
  order: number;
  probability: number;
  automation_rules?: Record<string, unknown>[];
}

export interface LeadScoreBreakdown {
  assessment: number;
  engagement: number;
  profile: number;
  referrals: number;
  skills_match: number;
  total: number;
}

export interface ContactWithScore extends CRMContact {
  score_breakdown?: LeadScoreBreakdown;
  recent_activities?: CRMActivity[];
  active_deals?: CRMDeal[];
}

export interface CRMMetrics {
  total_contacts: number;
  active_deals: number;
  pipeline_value: number;
  avg_lead_score: number;
  engagement_rate: number;
  conversion_rate: number;
  activities_this_month: number;
  deals_closed_this_month: number;
}
