/**
 * Database Entity Types
 * 
 * Comprehensive type definitions for all database entities.
 * These extend the auto-generated Supabase types with additional computed fields
 * and join relationships used throughout the application.
 */

import { Database } from '@/integrations/supabase/types';

// Base types from Supabase
export type Tables = Database['public']['Tables'];
export type Enums = Database['public']['Enums'];
type TablesRow<T extends keyof Tables> = Tables[T]['Row'];

// ============= User & Profile Types =============

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  avatar_url?: string | null;
  phone?: string | null;
  location?: string | null;
  current_title?: string | null;
  linkedin_url?: string | null;
  bio?: string | null;
  career_preferences?: string | null;
  desired_salary_min?: number | null;
  desired_salary_max?: number | null;
  notice_period_weeks?: number | null;
  remote_work_aspiration?: boolean;
  open_to_freelance_work?: boolean;
  freelance_categories?: string[] | null;
  freelance_availability_status?: 'available' | 'busy' | 'not_accepting' | null;
  salary_preference_hidden?: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined data from company_members
  company_members?: Array<{
    company_id: string;
    role: string;
    is_active: boolean;
    companies?: {
      name: string;
      slug: string;
    };
  }>;
  
  // Computed fields
  profile_completion_percentage?: number;
  match_score?: number;
}

export interface CandidateProfile {
  id: string;
  user_id?: string | null;
  first_name: string;
  last_name?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined profile data
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string | null;
    phone?: string | null;
  };
  
  // Computed fields
  total_applications?: number;
  active_interviews?: number;
}

// ============= Application & Job Types =============

export interface Application {
  id: string;
  job_id: string;
  user_id?: string | null;
  candidate_profile_id?: string | null;
  cover_letter?: string | null;
  resume_url?: string | null;
  current_stage: string;
  applied_at: string;
  created_at: string;
  updated_at: string;
  
  // Embedded candidate fields (fallback when no profile exists)
  candidate_full_name?: string | null;
  candidate_first_name?: string | null;
  candidate_last_name?: string | null;
  candidate_email?: string | null;
  candidate_phone?: string | null;
  candidate_title?: string | null;
  candidate_company?: string | null;
  candidate_linkedin_url?: string | null;
  candidate_resume_url?: string | null;
  
  // Joined candidate data
  candidate_profiles?: CandidateProfile;
  profiles?: UserProfile;
  
  // Joined job data
  jobs?: Job;
  
  // Computed fields
  days_in_stage?: number;
  stage_index?: number;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  company_id: string;
  location: string;
  employment_type: string;
  salary_min?: number | null;
  salary_max?: number | null;
  experience_level: string;
  remote_allowed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined company data
  companies?: {
    id: string;
    name: string;
    logo_url: string | null;
    slug: string;
  };
  
  // Joined tools/skills
  job_tools?: Array<{
    is_required: boolean;
    tools_and_skills?: {
      id: string;
      name: string;
      category: string;
    };
  }>;
  
  // Computed fields
  application_count?: number;
  view_count?: number;
  days_since_posted?: number;
}

export interface MatchScore {
  id: string;
  candidate_id: string;
  job_id: string;
  overall_score: number;
  created_at: string;
  updated_at: string;
  
  // Match breakdown
  match_factors?: {
    skills_match: number;
    experience_match: number;
    location_match: number;
    salary_match: number;
    culture_match: number;
  };
  
  // Explanations
  match_reasoning?: string;
  concerns?: string[];
  strengths?: string[];
}

// ============= Activity & Analytics Types =============

export interface UserActivityEvent {
  id: string;
  user_id: string;
  session_id?: string | null;
  event_type: string;
  event_category?: string | null;
  page_path?: string | null;
  referrer?: string | null;
  device_type?: string | null;
  duration_seconds?: number | null;
  created_at: string;
  
  // Joined profile data
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  
  // Typed action_data based on event_type
  action_data: ActivityActionData;
}

export type ActivityActionData =
  | { type: 'login'; method: 'email' | 'google' | 'linkedin' }
  | { type: 'logout'; session_duration_minutes: number }
  | { type: 'page_view'; page_path: string }
  | { type: 'job_view' | 'job_apply'; job_id: string; job_title?: string }
  | { type: 'profile_update'; fields_updated: string[] }
  | { type: 'message_sent'; recipient_id: string; category: string }
  | { type: 'document_upload' | 'document_download'; document_id: string }
  | { type: 'assessment_start' | 'assessment_submit'; assessment_id: string }
  | Record<string, unknown>;

export interface UserActivityTracking {
  user_id: string;
  last_activity_at: string;
  activity_count_24h: number;
  activity_count_7d: number;
  session_count: number;
  total_time_minutes: number;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined profile data
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  
  // Computed fields
  is_online?: boolean;
  activity_level?: 'highly_active' | 'active' | 'moderate' | 'low' | 'inactive';
}

// ============= Meeting & Video Types =============

export interface Meeting {
  id: string;
  meeting_code: string;
  title: string;
  description?: string | null;
  host_id: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string | null;
  actual_end?: string | null;
  meeting_type: string;
  status: string;
  application_id?: string | null;
  job_id?: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined host data
  host_profile?: {
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  
  // Participants
  meeting_participants?: MeetingParticipant[];
  
  // Interview intelligence (if applicable)
  interview_insights?: InterviewInsight[];
  
  // Computed fields
  participant_count?: number;
  duration_minutes?: number;
  is_upcoming?: boolean;
  is_ongoing?: boolean;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id?: string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  role: string;
  joined_at?: string | null;
  left_at?: string | null;
  is_active: boolean;
  audio_enabled: boolean;
  video_enabled: boolean;
  screen_sharing: boolean;
  connection_quality?: string | null;
  created_at: string;
  
  // Joined profile data
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  
  // Connection state
  peer_connection_state?: RTCPeerConnectionState;
  ice_connection_state?: RTCIceConnectionState;
}

export interface InterviewInsight {
  id: string;
  meeting_id: string;
  candidate_id: string;
  interviewer_id: string;
  created_at: string;
  updated_at: string;
  
  // Parsed scores
  scores: {
    communication_clarity: number;
    technical_depth: number;
    culture_fit: number;
    overall_impression: number;
  };
  
  // Red flags
  red_flags: Array<{
    flag: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
  }>;
  
  // Follow-up suggestions
  follow_up_questions: string[];
}

// ============= Booking Types =============

export interface Booking {
  id: string;
  booking_link_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string | null;
  scheduled_date: string;
  scheduled_time: string;
  timezone: string;
  status: string;
  confirmation_code: string;
  notes?: string | null;
  quantum_meeting_link?: string | null;
  google_meet_hangout_link?: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined booking link data
  booking_links?: {
    title: string;
    duration_minutes: number;
    owner_id: string;
    video_platform: 'tqc_meetings' | 'google_meet' | 'none';
  };
  
  // Joined owner data
  owner_profile?: {
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  
  // Guest information
  guests: Array<{
    name?: string;
    email: string;
  }>;
  
  // Computed fields
  is_upcoming?: boolean;
  is_past?: boolean;
  can_cancel?: boolean;
}

export interface BookingLink {
  id: string;
  slug: string;
  owner_id: string;
  title: string;
  description?: string | null;
  duration_minutes: number;
  video_platform: 'tqc_meetings' | 'google_meet' | 'none';
  buffer_time_minutes: number;
  max_bookings_per_day?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined owner data
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  
  // Availability schedule
  availability_schedule: Array<{
    day: number;
    slots: Array<{
      start: string;
      end: string;
    }>;
  }>;
  
  // Computed fields
  total_bookings?: number;
  upcoming_bookings?: number;
}

// ============= CRM Types =============

export interface CRMContact {
  id: string;
  profile_id: string;
  company_id?: string | null;
  contact_type: string;
  lifecycle_stage?: string | null;
  lead_score: number;
  engagement_score: number;
  tags: string[];
  owner_id?: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined profile data
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  
  // Joined company data
  companies?: {
    id: string;
    name: string;
    logo_url?: string | null;
  };
  
  // Custom fields (typed)
  custom_fields: Record<string, string | number | boolean | null>;
  
  // Computed fields
  recent_activities?: CRMActivity[];
  active_deals_count?: number;
  lifetime_value?: number;
}

export interface CRMDeal {
  id: string;
  deal_type: string;
  job_id?: string | null;
  application_id?: string | null;
  company_id?: string | null;
  title: string;
  description?: string | null;
  value?: number | null;
  currency: string;
  stage: string;
  probability?: number | null;
  close_date?: string | null;
  owner_id?: string | null;
  source?: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  
  // Joined contact data
  crm_contacts?: {
    id: string;
    lead_score: number;
    engagement_score: number;
  };
  
  // Joined company data
  companies?: {
    id: string;
    name: string;
  };
  
  // Joined job data (if applicable)
  jobs?: {
    id: string;
    title: string;
  };
  
  // Custom fields (typed)
  custom_fields: Record<string, string | number | boolean | null>;
}

export interface CRMActivity {
  id: string;
  activity_type: string;
  contact_id?: string | null;
  deal_id?: string | null;
  company_id?: string | null;
  subject?: string | null;
  description?: string | null;
  outcome?: string | null;
  direction?: 'inbound' | 'outbound' | null;
  duration_minutes?: number | null;
  created_by?: string | null;
  participants: unknown[];
  scheduled_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  
  // Joined contact data
  crm_contacts?: {
    id: string;
  };
  
  // Joined creator data
  creator_profile?: {
    full_name: string;
    avatar_url?: string | null;
  };
  
  // Typed metadata
  metadata: Record<string, unknown>;
}

// ============= Document Types =============

export interface Document {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  document_type: string;
  uploaded_by: string;
  application_id?: string | null;
  candidate_profile_id?: string | null;
  expires_at?: string | null;
  is_archived: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined uploader data
  uploader_profile?: {
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  
  // Joined application data (if applicable)
  applications?: {
    id: string;
    current_stage: string;
  };
  
  // Computed fields
  is_expired?: boolean;
  days_until_expiry?: number;
  file_size_mb?: number;
}

// ============= Assessment Types =============

export interface AssessmentAssignment {
  id: string;
  assessment_id: string;
  assigned_to: string;
  assigned_by: string;
  due_date?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  
  // Joined assessment data
  assessment_ref?: {
    id: string;
    name: string;
    category: string;
    estimated_time_minutes: number;
  };
  
  // Joined assignee data
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  
  // Joined results
  assessment_results?: AssessmentResult[];
  
  // Computed fields
  is_overdue?: boolean;
  days_until_due?: number;
}

export interface AssessmentResult {
  id: string;
  assignment_id: string;
  score: number;
  created_at: string;
  completed_at: string;
  
  // Typed results_data based on assessment category
  results_data: AssessmentResultData;
  
  // Joined assignment data
  assessment_assignments?: {
    id: string;
    due_date?: string | null;
  };
}

export type AssessmentResultData =
  | { type: 'incubator'; score: number; plan_quality: number; execution_strategy: number }
  | { type: 'swipe'; decisions_made: number; optimal_decisions: number; decision_quality: number }
  | { type: 'pressure_cooker'; tasks_completed: number; prioritization_score: number }
  | { type: 'blind_spot'; self_awareness_score: number; gaps: Array<{ dimension: string; gap_size: number }> }
  | { type: 'values_poker'; top_values: string[]; allocation_efficiency: number }
  | Record<string, unknown>;

// ============= Message Types =============

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id?: string | null;
  content: string;
  message_type: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined sender data
  sender_profile?: {
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  
  // Joined recipient data
  recipient_profile?: {
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  
  // Joined conversation data
  conversations?: {
    id: string;
    title?: string | null;
    status: string;
  };
  
  // Typed metadata
  metadata: MessageMetadata;
}

export type MessageMetadata = {
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  quoted_message_id?: string;
  ai_generated?: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
  [key: string]: unknown;
};

// ============= Task & Project Types =============

export interface UnifiedTask {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  due_date?: string | null;
  assigned_to?: string | null;
  board_id?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  
  // Joined assignee data
  assignee_profile?: {
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  
  // Joined board data (if applicable)
  task_boards?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  
  // Typed metadata
  metadata: TaskMetadata;
  
  // Computed fields
  is_overdue?: boolean;
  days_until_due?: number;
  priority_score?: number;
}

export type TaskMetadata = {
  subtasks?: Array<{
    title: string;
    completed: boolean;
  }>;
  checklist?: Array<{
    item: string;
    checked: boolean;
  }>;
  time_estimate_minutes?: number;
  actual_time_minutes?: number;
  blocked_by?: string[];
  [key: string]: unknown;
};

// ============= Utility Types =============

export type DatabaseError = {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
};

export type PaginationParams = {
  page: number;
  pageSize: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type SortOrder = 'asc' | 'desc';

export type DateRange = {
  start: string | Date;
  end: string | Date;
};

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';

export type QueryFilter = {
  column: string;
  operator: FilterOperator;
  value: unknown;
};
