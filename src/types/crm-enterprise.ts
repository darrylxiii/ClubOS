// Enterprise CRM Types

export interface CRMCampaign {
  id: string;
  name: string;
  description: string | null;
  source: 'instantly' | 'linkedin' | 'manual' | 'other';
  external_id: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  target_persona: string | null;
  target_industry: string[] | null;
  target_company_size: string[] | null;
  sequence_steps: number;
  total_prospects: number;
  total_sent: number;
  total_opens: number;
  total_replies: number;
  total_bounces: number;
  reply_rate: number;
  open_rate: number;
  start_date: string | null;
  end_date: string | null;
  owner_id: string | null;
  company_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined
  owner_name?: string;
  owner_avatar?: string;
}

export type ProspectStage = 
  | 'new' 
  | 'contacted' 
  | 'opened' 
  | 'replied' 
  | 'qualified' 
  | 'meeting_booked' 
  | 'proposal_sent' 
  | 'negotiation' 
  | 'closed_won' 
  | 'closed_lost' 
  | 'nurture' 
  | 'unsubscribed';

export type ProspectSource = 
  | 'instantly' 
  | 'linkedin' 
  | 'referral' 
  | 'website' 
  | 'event' 
  | 'cold_call' 
  | 'manual' 
  | 'import' 
  | 'other';

export type ReplySentiment = 
  | 'hot' 
  | 'warm' 
  | 'neutral' 
  | 'cold' 
  | 'negative' 
  | 'out_of_office' 
  | 'referral' 
  | 'objection' 
  | 'unsubscribe';

export interface CRMProspect {
  id: string;
  // Contact
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  email: string;
  email_status: 'valid' | 'invalid' | 'catch_all' | 'unknown' | 'bounced';
  phone: string | null;
  linkedin_url: string | null;
  job_title: string | null;
  // Company
  company_name: string | null;
  company_id: string | null;
  company_domain: string | null;
  company_size: string | null;
  industry: string | null;
  location: string | null;
  country: string | null;
  // CRM
  stage: ProspectStage;
  source: ProspectSource;
  campaign_id: string | null;
  // Engagement
  lead_score: number;
  engagement_score: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  emails_replied: number;
  last_contacted_at: string | null;
  last_opened_at: string | null;
  last_replied_at: string | null;
  last_activity_at: string | null;
  next_followup_at: string | null;
  // Qualification
  reply_sentiment: ReplySentiment | null;
  qualified_reason: string | null;
  disqualified_reason: string | null;
  deal_value: number | null;
  currency: string;
  close_probability: number;
  expected_close_date: string | null;
  // Assignment
  owner_id: string | null;
  assigned_at: string | null;
  // Meta
  tags: string[];
  custom_fields: Record<string, any>;
  notes: string | null;
  external_id: string | null;
  stakeholder_id: string | null;
  contact_id: string | null;
  // Close tracking
  closed_at?: string | null;
  closed_by?: string | null;
  closed_reason?: string | null;
  closed_reason_category?: string | null;
  competitor_name?: string | null;
  // Snooze
  snoozed_until?: string | null;
  // Activity
  next_activity_id?: string | null;
  next_activity_at?: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  // Joined
  owner_name?: string;
  owner_avatar?: string;
  campaign_name?: string;
}

export type TouchpointChannel = 'email' | 'linkedin' | 'phone' | 'whatsapp' | 'meeting' | 'website' | 'chat' | 'other';

export interface CRMTouchpoint {
  id: string;
  prospect_id: string;
  campaign_id: string | null;
  channel: TouchpointChannel;
  direction: 'outbound' | 'inbound';
  touchpoint_type: string;
  subject: string | null;
  content: string | null;
  content_preview: string | null;
  email_sequence_step: number | null;
  email_template_id: string | null;
  message_id: string | null;
  thread_id: string | null;
  opened: boolean;
  clicked: boolean;
  replied: boolean;
  bounced: boolean;
  bounce_type: 'hard' | 'soft' | 'spam' | 'invalid' | null;
  sentiment: 'positive' | 'neutral' | 'negative' | 'out_of_office' | null;
  intent: 'interested' | 'not_interested' | 'maybe' | 'referral' | 'meeting_request' | 'question' | 'objection' | 'unsubscribe' | null;
  ai_analysis: Record<string, any>;
  performed_by: string | null;
  metadata: Record<string, any>;
  external_id: string | null;
  performed_at: string;
  created_at: string;
}

export type ReplyClassification = 
  | 'hot_lead' 
  | 'warm_lead' 
  | 'interested' 
  | 'objection' 
  | 'not_interested' 
  | 'out_of_office' 
  | 'auto_reply' 
  | 'bounce' 
  | 'unsubscribe' 
  | 'referral' 
  | 'question' 
  | 'spam' 
  | 'unclassified';

export interface CRMEmailReply {
  id: string;
  prospect_id: string;
  touchpoint_id: string | null;
  campaign_id: string | null;
  // Email
  from_email: string;
  from_name: string | null;
  to_email: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  body_preview: string | null;
  message_id: string | null;
  thread_id: string | null;
  in_reply_to: string | null;
  // AI
  classification: ReplyClassification;
  sentiment_score: number;
  confidence_score: number;
  urgency: 'high' | 'medium' | 'low' | null;
  extracted_data: {
    mentioned_names?: string[];
    mentioned_dates?: string[];
    mentioned_companies?: string[];
    objections?: string[];
    questions?: string[];
    referral_contact?: {
      name?: string;
      email?: string;
      title?: string;
    };
    meeting_interest?: boolean;
    budget_mentioned?: boolean;
    timeline_mentioned?: string;
  };
  suggested_action: string | null;
  suggested_reply: string | null;
  ai_summary: string | null;
  ai_analysis: Record<string, any>;
  // Status
  is_read: boolean;
  is_actioned: boolean;
  actioned_at: string | null;
  actioned_by: string | null;
  action_taken: string | null;
  is_archived: boolean;
  is_spam: boolean;
  labels: string[];
  priority: number;
  external_id: string | null;
  metadata: Record<string, any>;
  received_at: string;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  prospect_name?: string;
  prospect_company?: string;
  campaign_name?: string;
}

export interface CRMAssignmentRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: 'round_robin' | 'territory' | 'capacity' | 'skill_based' | 'manual';
  is_active: boolean;
  priority: number;
  conditions: Record<string, any>;
  assign_to_user_id: string | null;
  assign_to_team: string | null;
  assign_to_role: string | null;
  round_robin_queue: string[];
  round_robin_index: number;
  max_prospects_per_user: number | null;
  max_prospects_per_day: number | null;
  created_by: string | null;
  company_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CRMSuppressionEntry {
  id: string;
  email: string;
  domain: string | null;
  reason: 'unsubscribe' | 'bounce' | 'spam_complaint' | 'manual' | 'gdpr_request' | 'legal' | 'competitor' | 'do_not_contact';
  source: string | null;
  requested_by: string | null;
  gdpr_request_id: string | null;
  company_id: string | null;
  added_by: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  suppressed_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface CRMImportLog {
  id: string;
  import_type: 'instantly_campaign' | 'instantly_replies' | 'csv_prospects' | 'csv_companies' | 'other';
  file_name: string | null;
  file_size: number | null;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  failed_rows: number;
  duplicate_rows: number;
  field_mapping: Record<string, string>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error_message: string | null;
  errors: { row: number; email: string; error: string }[];
  campaign_id: string | null;
  imported_by: string | null;
  company_id: string | null;
  metadata: Record<string, any>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// Stage configuration for Kanban
export const PROSPECT_STAGES: { value: ProspectStage; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'gray' },
  { value: 'contacted', label: 'Contacted', color: 'blue' },
  { value: 'opened', label: 'Opened', color: 'cyan' },
  { value: 'replied', label: 'Replied', color: 'purple' },
  { value: 'qualified', label: 'Qualified', color: 'green' },
  { value: 'meeting_booked', label: 'Meeting Booked', color: 'emerald' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: 'orange' },
  { value: 'negotiation', label: 'Negotiation', color: 'amber' },
  { value: 'closed_won', label: 'Closed Won', color: 'green' },
  { value: 'closed_lost', label: 'Closed Lost', color: 'red' },
  { value: 'nurture', label: 'Nurture', color: 'indigo' },
  { value: 'unsubscribed', label: 'Unsubscribed', color: 'gray' },
];

export const REPLY_CLASSIFICATIONS: { value: ReplyClassification; label: string; color: string; emoji: string }[] = [
  { value: 'hot_lead', label: 'Hot Lead', color: 'red', emoji: '🔥' },
  { value: 'warm_lead', label: 'Warm Lead', color: 'orange', emoji: '☀️' },
  { value: 'interested', label: 'Interested', color: 'green', emoji: '👍' },
  { value: 'objection', label: 'Objection', color: 'amber', emoji: '🤔' },
  { value: 'not_interested', label: 'Not Interested', color: 'gray', emoji: '👎' },
  { value: 'out_of_office', label: 'Out of Office', color: 'blue', emoji: '✈️' },
  { value: 'auto_reply', label: 'Auto Reply', color: 'slate', emoji: '🤖' },
  { value: 'bounce', label: 'Bounce', color: 'red', emoji: '❌' },
  { value: 'unsubscribe', label: 'Unsubscribe', color: 'gray', emoji: '🚫' },
  { value: 'referral', label: 'Referral', color: 'purple', emoji: '👋' },
  { value: 'question', label: 'Question', color: 'cyan', emoji: '❓' },
  { value: 'spam', label: 'Spam', color: 'gray', emoji: '🗑️' },
  { value: 'unclassified', label: 'Unclassified', color: 'gray', emoji: '❔' },
];

// Instantly.ai field mappings
export const INSTANTLY_FIELD_MAPPINGS: Record<string, string> = {
  'email': 'email',
  'Email': 'email',
  'EMAIL': 'email',
  'first_name': 'first_name',
  'First Name': 'first_name',
  'firstName': 'first_name',
  'last_name': 'last_name',
  'Last Name': 'last_name',
  'lastName': 'last_name',
  'company': 'company_name',
  'Company': 'company_name',
  'company_name': 'company_name',
  'Company Name': 'company_name',
  'companyName': 'company_name',
  'title': 'title',
  'Title': 'title',
  'job_title': 'title',
  'Job Title': 'title',
  'jobTitle': 'title',
  'position': 'title',
  'Position': 'title',
  'phone': 'phone',
  'Phone': 'phone',
  'phone_number': 'phone',
  'linkedin': 'linkedin_url',
  'LinkedIn': 'linkedin_url',
  'linkedin_url': 'linkedin_url',
  'LinkedIn URL': 'linkedin_url',
  'linkedinUrl': 'linkedin_url',
  'location': 'location',
  'Location': 'location',
  'city': 'location',
  'City': 'location',
  'country': 'country',
  'Country': 'country',
  'industry': 'industry',
  'Industry': 'industry',
  'company_size': 'company_size',
  'Company Size': 'company_size',
  'employees': 'company_size',
  'Employees': 'company_size',
  'domain': 'company_domain',
  'Domain': 'company_domain',
  'website': 'company_domain',
  'Website': 'company_domain',
  // Instantly engagement fields
  'sent': 'sent_count',
  'opens': 'open_count',
  'clicks': 'click_count',
  'replies': 'reply_count',
  'bounced': 'bounced',
  'unsubscribed': 'unsubscribed',
  'status': 'status',
  'step': 'last_step',
};
