export interface CompanyStakeholder {
  id: string;
  company_id: string;
  profile_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  job_title: string | null;
  department: string | null;
  role_type: 'decision_maker' | 'influencer' | 'gatekeeper' | 'end_user' | 'champion' | 'blocker' | 'unknown';
  seniority_level: string | null;
  communication_style: string | null;
  response_time_avg_hours: number | null;
  preferred_channel: string | null;
  timezone: string | null;
  working_hours: Record<string, string> | null;
  first_contacted_at: string | null;
  last_contacted_at: string | null;
  total_interactions: number;
  sentiment_score: number | null;
  engagement_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyInteraction {
  id: string;
  company_id: string;
  job_id: string | null;
  deal_id: string | null;
  interaction_type: 'whatsapp' | 'email' | 'phone_call' | 'zoom_meeting' | 'linkedin_message' | 'in_person' | 'other';
  interaction_subtype: string | null;
  interaction_date: string;
  duration_minutes: number | null;
  direction: 'inbound' | 'outbound' | 'mutual';
  initiated_by_stakeholder_id: string | null;
  our_participant_id: string | null;
  subject: string | null;
  summary: string | null;
  raw_content: string | null;
  key_topics: string[] | null;
  mentioned_roles: string[] | null;
  mentioned_candidates: string[] | null;
  sentiment_score: number | null;
  urgency_score: number | null;
  deal_stage_hint: string | null;
  next_action: string | null;
  attachment_urls: string[] | null;
  external_id: string | null;
  source_metadata: Record<string, any> | null;
  status: 'active' | 'archived' | 'deleted';
  is_manually_entered: boolean;
  created_at: string;
  updated_at: string;
}

export interface InteractionParticipant {
  id: string;
  interaction_id: string;
  stakeholder_id: string;
  participation_type: 'sender' | 'recipient' | 'cc' | 'bcc' | 'attendee' | 'organizer';
  mentioned_only: boolean;
  created_at: string;
}

export interface InteractionInsight {
  id: string;
  interaction_id: string;
  insight_type: 'hiring_urgency' | 'budget_signal' | 'decision_timeline' | 'stakeholder_preference' | 'competitor_mention' | 'pain_point' | 'red_flag' | 'positive_signal';
  insight_text: string;
  confidence_score: number | null;
  evidence_quotes: string[] | null;
  extracted_date: string | null;
  extracted_budget: number | null;
  extracted_headcount: number | null;
  created_at: string;
}

export interface InteractionFormData {
  company_id: string;
  job_id?: string;
  interaction_type: CompanyInteraction['interaction_type'];
  interaction_subtype?: string;
  interaction_date: Date;
  duration_minutes?: number;
  direction: CompanyInteraction['direction'];
  participant_ids: string[];
  subject?: string;
  summary?: string;
  notes?: string;
  urgency_score?: number;
  next_action?: string;
  attachment_urls?: string[];
}
