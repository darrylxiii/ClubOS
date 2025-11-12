/**
 * API Request/Response Types
 * 
 * Type definitions for all API endpoints, edge functions, and RPC calls.
 * Provides type safety for client-server communication.
 */

import { User, Session } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

// ============= Base API Types =============

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode?: number;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ============= Authentication API Types =============

export interface SignUpRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  inviteCode?: string;
}

export interface SignUpResponse {
  user: User;
  session: Session | null;
  needsEmailVerification: boolean;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  user: User;
  session: Session;
}

export interface OAuthSignInRequest {
  provider: 'google' | 'linkedin' | 'apple';
  redirectTo?: string;
}

export interface VerifyOTPRequest {
  email?: string;
  phone?: string;
  token: string;
  type: 'email' | 'sms';
}

export interface VerifyOTPResponse {
  user: User;
  session: Session;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface UpdatePasswordRequest {
  newPassword: string;
}

// ============= Profile API Types =============

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  location?: string;
  current_title?: string;
  linkedin_url?: string;
  bio?: string;
  career_preferences?: string;
  desired_salary_min?: number;
  desired_salary_max?: number;
  notice_period_weeks?: number;
  remote_work_aspiration?: boolean;
  open_to_freelance_work?: boolean;
  freelance_categories?: string[];
  freelance_availability_status?: 'available' | 'busy' | 'not_accepting';
  salary_preference_hidden?: boolean;
}

export interface UploadResumeRequest {
  file: File;
  userId: string;
}

export interface UploadResumeResponse {
  resume_url: string;
  resume_filename: string;
  parsed_data?: {
    skills?: string[];
    experience_years?: number;
    education?: string[];
  };
}

// ============= Job & Application API Types =============

export interface CreateJobRequest {
  title: string;
  description: string;
  company_id: string;
  location: string;
  employment_type: Database['public']['Enums']['employment_type'];
  salary_min?: number;
  salary_max?: number;
  required_skills?: string[];
  nice_to_have_skills?: string[];
  experience_level: Database['public']['Enums']['experience_level'];
  remote_allowed: boolean;
}

export interface CreateJobResponse {
  job: Database['public']['Tables']['jobs']['Row'];
  job_id: string;
}

export interface ApplyToJobRequest {
  job_id: string;
  cover_letter?: string;
  resume_url?: string;
}

export interface ApplyToJobResponse {
  application_id: string;
  application: Database['public']['Tables']['applications']['Row'];
}

export interface AdvanceApplicationRequest {
  application_id: string;
  new_stage: string;
  notes?: string;
}

export interface RejectApplicationRequest {
  application_id: string;
  rejection_reason?: string;
  feedback?: string;
}

// ============= Matching & AI API Types =============

export interface CalculateMatchScoreRequest {
  candidate_id: string;
  job_id: string;
}

export interface CalculateMatchScoreResponse {
  match_score: number;
  match_factors: {
    skills_match: number;
    experience_match: number;
    location_match: number;
    salary_match: number;
    culture_match: number;
  };
  reasoning: string;
  strengths: string[];
  concerns: string[];
}

export interface AIRecommendationRequest {
  user_id: string;
  context: 'jobs' | 'candidates' | 'career_advice' | 'interview_prep';
  limit?: number;
}

export interface AIRecommendationResponse<T = unknown> {
  recommendations: T[];
  reasoning: string;
  confidence_score: number;
}

// ============= Meeting & Booking API Types =============

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  scheduled_start: string;
  scheduled_end: string;
  participants: Array<{
    user_id?: string;
    guest_email?: string;
    guest_name?: string;
    role: 'host' | 'participant' | 'guest' | 'observer';
  }>;
  meeting_type: 'interview' | 'screening' | 'discussion' | 'debrief' | 'presentation' | 'other';
  application_id?: string;
  job_id?: string;
}

export interface CreateMeetingResponse {
  meeting_id: string;
  meeting_code: string;
  join_url: string;
}

export interface CreateBookingRequest {
  booking_link_slug: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  selected_date: string;
  selected_time: string;
  timezone: string;
  additional_guests?: Array<{
    name?: string;
    email: string;
  }>;
  notes?: string;
}

export interface CreateBookingResponse {
  booking_id: string;
  confirmation_code: string;
  meeting_link?: string;
}

export interface GetAvailableSlotsRequest {
  booking_link_slug: string;
  date: string;
  timezone: string;
}

export interface GetAvailableSlotsResponse {
  slots: Array<{
    start: string;
    end: string;
    available: boolean;
  }>;
}

export interface CancelBookingRequest {
  booking_id: string;
  cancellation_reason?: string;
}

// ============= WebRTC Signaling Types =============

export interface WebRTCSignalRequest {
  meeting_id: string;
  sender_id: string;
  recipient_id: string;
  signal_type: 'offer' | 'answer' | 'ice-candidate';
  signal_data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export interface JoinMeetingRequest {
  meeting_id: string;
  user_id?: string;
  guest_name?: string;
  guest_email?: string;
  audio_enabled: boolean;
  video_enabled: boolean;
}

export interface JoinMeetingResponse {
  participant_id: string;
  meeting_details: {
    title: string;
    scheduled_start: string;
    scheduled_end: string;
    host_id: string;
  };
  existing_participants: Array<{
    id: string;
    user_id?: string;
    guest_name?: string;
    role: string;
    audio_enabled: boolean;
    video_enabled: boolean;
  }>;
}

// ============= Interview Intelligence API Types =============

export interface AnalyzeInterviewRequest {
  meeting_id: string;
  transcript: string;
  candidate_id: string;
  job_id?: string;
}

export interface AnalyzeInterviewResponse {
  insight_id: string;
  scores: {
    communication_clarity: number;
    technical_depth: number;
    culture_fit: number;
    overall_impression: number;
  };
  red_flags: Array<{
    flag: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
  }>;
  strengths: string[];
  concerns: string[];
  follow_up_questions: string[];
  recommendation: 'strong_hire' | 'hire' | 'maybe' | 'no_hire';
}

export interface GenerateInterviewReportRequest {
  meeting_id: string;
  candidate_id: string;
}

export interface GenerateInterviewReportResponse {
  report_id: string;
  report_url: string;
  summary: string;
  key_strengths: string[];
  key_weaknesses: string[];
  next_steps: string[];
}

// ============= Email & Messaging API Types =============

export interface SendEmailRequest {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  html_body?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface SendMessageRequest {
  conversation_id?: string;
  recipient_id?: string;
  subject?: string;
  content: string;
  message_type: 'text' | 'system' | 'notification';
  metadata?: Record<string, unknown>;
}

export interface SendMessageResponse {
  message_id: string;
  conversation_id: string;
}

// ============= Document API Types =============

export interface UploadDocumentRequest {
  file: File;
  document_type: Database['public']['Enums']['document_type'];
  application_id?: string;
  candidate_profile_id?: string;
  expires_at?: string;
}

export interface UploadDocumentResponse {
  document_id: string;
  file_url: string;
  file_size: number;
}

export interface GenerateDossierRequest {
  candidate_id: string;
  include_sections: Array<'profile' | 'experience' | 'assessments' | 'interviews' | 'references'>;
  watermark: boolean;
}

export interface GenerateDossierResponse {
  dossier_id: string;
  share_link: string;
  expires_at: string;
}

// ============= Activity Tracking API Types =============

export interface TrackEventRequest {
  event_type: string;
  event_category?: string;
  action_data?: Record<string, unknown>;
  page_path?: string;
  referrer?: string;
  duration_seconds?: number;
}

export interface UpdatePresenceRequest {
  status: 'online' | 'away' | 'offline';
  current_page?: string;
}

// ============= RPC Function Types =============

export type RPCFunctions = Database['public']['Functions'];

export type RPCCallParams<T extends keyof RPCFunctions> = 
  RPCFunctions[T]['Args'];

export type RPCCallResponse<T extends keyof RPCFunctions> = 
  RPCFunctions[T]['Returns'];

// ============= Webhook Types =============

export interface WebhookPayload<T = unknown> {
  type: string;
  table: string;
  record: T;
  schema: string;
  old_record?: T;
}

export interface CalendarWebhookPayload {
  event_type: 'created' | 'updated' | 'deleted';
  event_id: string;
  calendar_id: string;
  event_data: {
    title: string;
    start: string;
    end: string;
    attendees: string[];
  };
}
