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

// ============= User & Profile Types =============

export interface UserProfile extends Tables['profiles']['Row'] {
  // Joined data from company_members
  company_members?: Array<{
    company_id: string;
    role: Enums['company_role'];
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

export interface CandidateProfile extends Tables['candidate_profiles']['Row'] {
  // Joined profile data
  profiles?: Pick<Tables['profiles']['Row'], 'full_name' | 'email' | 'avatar_url' | 'phone'>;
  
  // Computed fields
  total_applications?: number;
  active_interviews?: number;
}

// ============= Application & Job Types =============

export interface Application extends Tables['applications']['Row'] {
  // Joined candidate data
  candidate_profiles?: CandidateProfile;
  profiles?: UserProfile;
  
  // Joined job data
  jobs?: Job;
  
  // Computed fields
  days_in_stage?: number;
  stage_index?: number;
}

export interface Job extends Tables['jobs']['Row'] {
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

export interface MatchScore extends Tables['match_scores']['Row'] {
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

export interface UserActivityEvent extends Tables['user_activity_events']['Row'] {
  // Joined profile data
  profiles?: Pick<Tables['profiles']['Row'], 'full_name' | 'email' | 'avatar_url'>;
  
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

export interface UserActivityTracking extends Tables['user_activity_tracking']['Row'] {
  // Joined profile data
  profiles?: Pick<Tables['profiles']['Row'], 'full_name' | 'email' | 'avatar_url'>;
  
  // Computed fields
  is_online?: boolean;
  activity_level?: 'highly_active' | 'active' | 'moderate' | 'low' | 'inactive';
}

// ============= Meeting & Video Types =============

export interface Meeting extends Tables['meetings']['Row'] {
  // Joined host data
  host_profile?: Pick<Tables['profiles']['Row'], 'full_name' | 'email' | 'avatar_url'>;
  
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

export interface MeetingParticipant extends Tables['meeting_participants']['Row'] {
  // Joined profile data
  profiles?: Pick<Tables['profiles']['Row'], 'full_name' | 'email' | 'avatar_url'>;
  
  // Connection state
  peer_connection_state?: RTCPeerConnectionState;
  ice_connection_state?: RTCIceConnectionState;
}

export interface InterviewInsight extends Tables['interview_insights']['Row'] {
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

export interface Booking extends Tables['bookings']['Row'] {
  // Joined booking link data
  booking_links?: {
    title: string;
    duration_minutes: number;
    owner_id: string;
    video_platform: 'tqc_meetings' | 'google_meet' | 'none';
  };
  
  // Joined owner data
  owner_profile?: Pick<Tables['profiles']['Row'], 'full_name' | 'email' | 'avatar_url'>;
  
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

export interface BookingLink extends Tables['booking_links']['Row'] {
  // Joined owner data
  profiles?: Pick<Tables['profiles']['Row'], 'full_name' | 'email' | 'avatar_url'>;
  
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

export interface CRMContact extends Tables['crm_contacts']['Row'] {
  // Joined profile data
  profiles?: Pick<Tables['profiles']['Row'], 'full_name' | 'email' | 'avatar_url'>;
  
  // Joined company data
  companies?: Pick<Tables['companies']['Row'], 'id' | 'name' | 'logo_url'>;
  
  // Custom fields (typed)
  custom_fields: Record<string, string | number | boolean | null>;
  
  // Computed fields
  recent_activities?: CRMActivity[];
  active_deals_count?: number;
  lifetime_value?: number;
}

export interface CRMDeal extends Tables['crm_deals']['Row'] {
  // Joined contact data
  crm_contacts?: Pick<CRMContact, 'id' | 'lead_score' | 'engagement_score'>;
  
  // Joined company data
  companies?: Pick<Tables['companies']['Row'], 'id' | 'name'>;
  
  // Joined job data (if applicable)
  jobs?: Pick<Job, 'id' | 'title' | 'employment_type'>;
  
  // Custom fields (typed)
  custom_fields: Record<string, string | number | boolean | null>;
}

export interface CRMActivity extends Tables['crm_activities']['Row'] {
  // Joined contact data
  crm_contacts?: Pick<CRMContact, 'id'>;
  
  // Joined creator data
  creator_profile?: Pick<Tables['profiles']['Row'], 'full_name' | 'avatar_url'>;
  
  // Typed metadata
  metadata: Record<string, unknown>;
}

// ============= Document Types =============

export interface Document extends Tables['documents']['Row'] {
  // Joined uploader data
  uploader_profile?: Pick<Tables['profiles']['Row'], 'full_name' | 'email' | 'avatar_url'>;
  
  // Joined application data (if applicable)
  applications?: Pick<Application, 'id' | 'current_stage'>;
  
  // Computed fields
  is_expired?: boolean;
  days_until_expiry?: number;
  file_size_mb?: number;
}

// ============= Assessment Types =============

export interface AssessmentAssignment extends Tables['assessment_assignments']['Row'] {
  // Joined assessment data
  assessments?: Pick<Tables['assessments']['Row'], 'id' | 'name' | 'category' | 'estimated_time_minutes'>;
  
  // Joined assignee data
  profiles?: Pick<Tables['profiles']['Row'], 'full_name' | 'email' | 'avatar_url'>;
  
  // Joined results
  assessment_results?: AssessmentResult[];
  
  // Computed fields
  is_overdue?: boolean;
  days_until_due?: number;
}

export interface AssessmentResult extends Tables['assessment_results']['Row'] {
  // Typed results_data based on assessment category
  results_data: AssessmentResultData;
  
  // Joined assignment data
  assessment_assignments?: Pick<AssessmentAssignment, 'id' | 'due_date'>;
}

export type AssessmentResultData =
  | { type: 'incubator'; score: number; plan_quality: number; execution_strategy: number }
  | { type: 'swipe'; decisions_made: number; optimal_decisions: number; decision_quality: number }
  | { type: 'pressure_cooker'; tasks_completed: number; prioritization_score: number }
  | { type: 'blind_spot'; self_awareness_score: number; gaps: Array<{ dimension: string; gap_size: number }> }
  | { type: 'values_poker'; top_values: string[]; allocation_efficiency: number }
  | Record<string, unknown>;

// ============= Message Types =============

export interface Message extends Tables['messages']['Row'] {
  // Joined sender data
  sender_profile?: Pick<Tables['profiles']['Row'], 'full_name' | 'email' | 'avatar_url'>;
  
  // Joined recipient data
  recipient_profile?: Pick<Tables['profiles']['Row'], 'full_name' | 'email' | 'avatar_url'>;
  
  // Joined conversation data
  conversations?: Pick<Tables['conversations']['Row'], 'id' | 'conversation_type' | 'subject'>;
  
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

export interface UnifiedTask extends Tables['unified_tasks']['Row'] {
  // Joined assignee data
  assignee_profile?: Pick<Tables['profiles']['Row'], 'full_name' | 'email' | 'avatar_url'>;
  
  // Joined board data (if applicable)
  task_boards?: Pick<Tables['task_boards']['Row'], 'id' | 'name' | 'icon' | 'color'>;
  
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
