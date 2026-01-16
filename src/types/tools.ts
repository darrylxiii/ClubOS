/**
 * AI Tool Types for Edge Functions
 *
 * Type definitions for AI tool calls executed via Supabase Edge Functions.
 * These types provide strong typing for the tool dispatcher and all tool implementations.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============= Tool Call Types =============

export interface ToolCallFunction {
  name: string;
  arguments: string | Record<string, unknown>;
}

export interface ToolCall {
  id?: string;
  type?: 'function';
  function: ToolCallFunction;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

// ============= Action Log Types =============

export type ActionStatus = 'pending' | 'completed' | 'failed';

export interface ActionLogEntry {
  user_id: string;
  action_type: string;
  action_data: Record<string, unknown>;
  status: ActionStatus;
  result?: unknown;
  error_message?: string;
}

// ============= Job Search & Application Tool Args =============

export interface SearchJobsArgs {
  title?: string;
  location?: string;
  employmentType?: 'fulltime' | 'parttime' | 'contract' | 'freelance';
  salaryMin?: number;
  skills?: string[];
}

export interface SearchJobsResult {
  success: boolean;
  jobs: Array<{
    id: string;
    title: string;
    location: string;
    employment_type: string;
    salary_min: number;
    salary_max: number;
    currency: string;
    companies: { name: string; logo_url: string } | null;
    matchScore: number;
  }>;
  message: string;
}

export interface AnalyzeJobFitArgs {
  jobId: string;
}

export interface AnalyzeJobFitResult {
  success: boolean;
  job: { title: string; company: string | undefined };
  analysis: {
    overallFit: number;
    strengths: string[];
    gaps: string[];
    recommendation: string;
  };
}

export interface ApplyToJobArgs {
  jobId: string;
  customMessage?: string;
  attachResume?: boolean;
}

export interface ApplyToJobResult {
  success: boolean;
  applicationId?: string;
  message: string;
}

export interface GenerateCoverLetterArgs {
  jobId: string;
  tone?: 'professional' | 'creative' | 'technical';
  highlights?: string[];
}

export interface GenerateCoverLetterResult {
  success: boolean;
  coverLetter: string;
  message: string;
}

// ============= Task Management Tool Args =============

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface CreateTaskArgs {
  title: string;
  description?: string;
  objectiveId?: string;
  dueDate?: string;
  priority?: TaskPriority;
}

export interface CreateTaskResult {
  success: boolean;
  task: {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: TaskPriority;
    due_date: string | null;
    objective_id: string | null;
  };
  message: string;
}

export interface BulkCreateTasksArgs {
  goalDescription: string;
  deadline?: string;
  estimatedHours?: number;
}

export interface BulkCreateTasksResult {
  success: boolean;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: TaskPriority;
    due_date: string | null;
  }>;
  message: string;
}

export interface RescheduleTasksArgs {
  taskIds: string[];
  reason: string;
}

export interface RescheduleTasksResult {
  success: boolean;
  rescheduledCount: number;
  message: string;
}

export interface SuggestNextTaskArgs {
  currentTime?: string;
  availableHours?: number;
}

export interface SuggestNextTaskResult {
  success: boolean;
  suggestedTask: {
    id: string;
    title: string;
    priority: TaskPriority;
    due_date: string | null;
  } | null;
  reasoning?: string;
  message?: string;
}

export interface AnalyzeTaskLoadResult {
  success: boolean;
  analysis: {
    totalTasks: number;
    urgentTasks: number;
    highPriorityTasks: number;
    workloadLevel: 'high' | 'medium' | 'manageable';
    recommendation: string;
  };
}

// ============= Interview Prep Tool Args =============

export type InterviewQuestionType = 'behavioral' | 'technical' | 'system_design' | 'cultural_fit';

export interface GenerateInterviewQuestionsArgs {
  companyName: string;
  role: string;
  interviewType: InterviewQuestionType;
}

export interface GenerateInterviewQuestionsResult {
  success: boolean;
  questions: string[];
  message: string;
}

export interface ResearchCompanyArgs {
  companyName: string;
  jobId?: string;
}

export interface ResearchCompanyResult {
  success: boolean;
  research: {
    companyName: string;
    industry: string;
    size: string;
    mission: string;
    culture: string[];
    techStack: string[];
    recentNews: string;
  };
  message: string;
}

export interface CreateInterviewBriefingArgs {
  applicationId: string;
  interviewDate: string;
}

export interface CreateInterviewBriefingResult {
  success: boolean;
  briefing: {
    interviewDate: string;
    company: string | undefined;
    role: string | undefined;
    preparationChecklist: string[];
    keyPoints: string[];
  };
  message: string;
}

// ============= Messaging Tool Args =============

export type MessageType = 'follow_up' | 'introduction' | 'thank_you' | 'negotiation' | 'networking';
export type MessageTone = 'formal' | 'friendly' | 'casual';

export interface DraftMessageArgs {
  recipientId: string;
  messageType: MessageType;
  context: string;
  tone?: MessageTone;
}

export interface DraftMessageResult {
  success: boolean;
  message: string;
  suggestion: string;
}

export interface SendMessageArgs {
  conversationId: string;
  content: string;
  attachments?: string[];
}

export interface SendMessageResult {
  success: boolean;
  messageId: string;
  message: string;
}

export interface ScheduleFollowUpArgs {
  conversationId: string;
  content: string;
  sendAt: string;
}

export interface ScheduleFollowUpResult {
  success: boolean;
  message: string;
}

export interface AnalyzeConversationSentimentArgs {
  conversationId: string;
}

export interface AnalyzeConversationSentimentResult {
  success: boolean;
  analysis: {
    overallSentiment: string;
    tone: string;
    recommendation: string;
    responseRate: string;
  };
}

// ============= Calendar Tool Args =============

export interface CreateBookingLinkArgs {
  title: string;
  duration: number;
  bufferTime?: number;
  description?: string;
}

export interface CreateBookingLinkResult {
  success: boolean;
  bookingLink: {
    id: string;
    user_id: string;
    title: string;
    description: string;
    duration_minutes: number;
    buffer_time_minutes: number;
  };
  message: string;
}

export interface SuggestMeetingTimesArgs {
  participantIds: string[];
  duration: number;
  preferredDays?: string[];
}

export interface SuggestMeetingTimesResult {
  success: boolean;
  suggestions: Array<{
    day: string;
    time: string;
    availability: 'high' | 'medium' | 'low';
  }>;
  message: string;
}

// ============= Meeting Scheduling Tool Args =============

export type MeetingAccessType = 'invite_only' | 'public' | 'password';

export interface ScheduleMeetingArgs {
  title: string;
  description?: string;
  participants?: string[];
  date: string;
  time: string;
  duration: number;
  timezone?: string;
  enableNotetaker?: boolean;
  accessType?: MeetingAccessType;
}

export interface ScheduleMeetingResult {
  success: boolean;
  meeting: {
    id: string;
    title: string;
    start: string;
    end: string;
    meetingCode: string;
    link: string;
  };
  message: string;
}

export interface FindFreeSlotsArgs {
  duration: number;
  startDate: string;
  endDate: string;
  participantIds?: string[];
  workingHours?: {
    start: string;
    end: string;
  };
}

export interface FreeSlot {
  date: string;
  time: string;
  datetime: string;
  score: number;
  reason: string;
}

export interface FindFreeSlotsResult {
  success: boolean;
  slots: FreeSlot[];
  message: string;
}

export interface CheckMeetingConflictsArgs {
  proposedDate: string;
  proposedTime: string;
  duration: number;
  participantIds?: string[];
}

export interface MeetingConflict {
  title: string;
  time: string;
  source: 'meeting' | 'booking';
}

export interface CheckMeetingConflictsResult {
  success: boolean;
  hasConflict: boolean;
  conflicts: MeetingConflict[];
  softConflicts: MeetingConflict[];
  alternatives: FreeSlot[];
  message: string;
}

export interface RescheduleMeetingArgs {
  meetingId: string;
  newDate: string;
  newTime: string;
  newDuration?: number;
  reason?: string;
}

export interface RescheduleMeetingResult {
  success: boolean;
  error?: string;
  message?: string;
  meeting?: {
    id: string;
    title: string;
    newStart: string;
    newEnd: string;
  };
}

export interface CancelMeetingArgs {
  meetingId: string;
  reason?: string;
  notifyParticipants?: boolean;
}

export interface CancelMeetingResult {
  success: boolean;
  error?: string;
  message?: string;
  meeting?: {
    id: string;
    title: string;
    originalStart: string;
  };
}

// ============= Talent Pool Tool Args =============

export type TalentTier = 'hot' | 'warm' | 'strategic' | 'pool' | 'dormant';

export interface SearchTalentPoolArgs {
  query?: string;
  tier?: TalentTier;
  minMoveProbability?: number;
  limit?: number;
  industries?: string[];
  locations?: string[];
}

export interface TalentPoolCandidate {
  id: string;
  full_name: string;
  current_title: string;
  current_company: string;
  talent_tier: TalentTier;
  move_probability: number;
  location: string;
  email: string;
  years_of_experience: number;
  availability_status: string;
  last_engagement_date: string | null;
  tier_score: number;
  industries: string[];
  seniority_level: string;
}

export interface SearchTalentPoolResult {
  success: boolean;
  candidates: TalentPoolCandidate[];
  count: number;
  message: string;
}

export interface GetCandidateMoveProbabilityArgs {
  candidateId: string;
  recalculate?: boolean;
}

export interface GetCandidateMoveProbabilityResult {
  success: boolean;
  candidate: {
    id: string;
    full_name: string;
    move_probability: number;
    move_probability_factors: Record<string, unknown>;
    talent_tier: TalentTier;
    current_title: string;
    current_company: string;
    availability_status: string;
    last_engagement_date: string | null;
  };
  interpretation: string;
  recommendation: string;
}

export interface GetCandidatesNeedingAttentionArgs {
  limit?: number;
  daysSinceContact?: number;
  strategistId?: string;
}

export interface CandidateNeedingAttention {
  id: string;
  full_name: string;
  talent_tier: TalentTier;
  move_probability: number;
  last_engagement_date: string | null;
  current_title: string;
  current_company: string;
  email: string;
  owned_by_strategist_id: string | null;
}

export interface GetCandidatesNeedingAttentionResult {
  success: boolean;
  urgent: CandidateNeedingAttention[];
  important: CandidateNeedingAttention[];
  standard: CandidateNeedingAttention[];
  totalCount: number;
  message: string;
}

export type TouchpointType = 'email' | 'call' | 'meeting' | 'linkedin' | 'whatsapp' | 'tier_change' | 'other';

export interface LogCandidateTouchpointArgs {
  candidateId: string;
  touchpointType: TouchpointType;
  notes?: string;
  responseReceived?: boolean;
  requiresResponse?: boolean;
  nextActionDate?: string;
}

export interface LogCandidateTouchpointResult {
  success: boolean;
  interaction: {
    id: string;
    candidate_id: string;
    interaction_type: TouchpointType;
    notes: string;
    interaction_date: string;
    recorded_by: string;
  };
  message: string;
}

export interface UpdateCandidateTierArgs {
  candidateId: string;
  newTier: TalentTier;
  reason?: string;
}

export interface UpdateCandidateTierResult {
  success: boolean;
  previousTier: TalentTier;
  newTier: TalentTier;
  candidateName: string;
  message: string;
}

// ============= Communication Intelligence Tool Args =============

export type CommunicationChannel = 'all' | 'email' | 'whatsapp' | 'sms' | 'phone' | 'meeting' | 'linkedin';
export type EntityType = 'candidate' | 'company' | 'prospect';
export type DateRange = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'all_time';
export type RiskLevel = 'all' | 'healthy' | 'warning' | 'high' | 'critical';

export interface SearchCommunicationsArgs {
  query: string;
  channel?: CommunicationChannel;
  entity_type?: EntityType;
  entity_id?: string;
  date_range?: DateRange;
}

export interface CommunicationSearchResult {
  type: 'communication' | 'import';
  channel: string;
  direction?: 'inbound' | 'outbound';
  preview?: string;
  title?: string;
  summary?: string;
  sentiment: number | null;
  date: string;
  entity_type: EntityType;
  entity_id: string;
}

export interface SearchCommunicationsResult {
  success: boolean;
  query: string;
  channel: CommunicationChannel;
  date_range: DateRange;
  total_results: number;
  results: CommunicationSearchResult[];
  message: string;
}

export interface GetEntityCommunicationSummaryArgs {
  entity_type: EntityType;
  entity_id: string;
}

export interface EntityCommunicationSummary {
  total_communications: number;
  channel_breakdown: Record<string, number>;
  last_contact: string | null;
  days_since_contact: number | null;
  avg_sentiment: number | null;
  relationship_health: number | null;
  risk_level: RiskLevel | 'unknown';
  external_imports: number;
}

export interface CommunicationHighlight {
  channel: string;
  direction: 'inbound' | 'outbound';
  preview: string;
  date: string;
}

export interface GetEntityCommunicationSummaryResult {
  success: boolean;
  entity_type: EntityType;
  entity_id: string;
  entity_name: string;
  summary: EntityCommunicationSummary;
  pending_action_items: string[];
  recommended_next_action: string;
  recent_highlights: CommunicationHighlight[];
}

export interface GetRelationshipHealthArgs {
  risk_level?: RiskLevel;
  entity_type?: EntityType;
  limit?: number;
}

export interface RelationshipScore {
  entity_type: EntityType;
  entity_id: string;
  entity_name: string;
  health_score: number;
  risk_level: Exclude<RiskLevel, 'all'>;
  days_since_contact: number;
  recommended_action: string;
}

export interface GetRelationshipHealthResult {
  success: boolean;
  filter: {
    risk_level: RiskLevel;
    entity_type: EntityType | undefined;
  };
  summary: {
    total: number;
    healthy: number;
    warning: number;
    high_risk: number;
    critical: number;
  };
  relationships: RelationshipScore[];
  message: string;
}

// ============= Tool Executor Type =============

export type ToolExecutor<TArgs = Record<string, unknown>, TResult = unknown> = (
  args: TArgs,
  userId: string,
  supabase: SupabaseClient
) => Promise<TResult>;

// ============= Tool Name Union Type =============

export type ToolName =
  // Job Search & Application
  | 'search_jobs'
  | 'analyze_job_fit'
  | 'apply_to_job'
  | 'generate_cover_letter'
  // Task Management
  | 'create_task'
  | 'bulk_create_tasks'
  | 'reschedule_tasks'
  | 'suggest_next_task'
  | 'analyze_task_load'
  // Interview Prep
  | 'generate_interview_questions'
  | 'research_company'
  | 'create_interview_briefing'
  // Messaging
  | 'draft_message'
  | 'send_message'
  | 'schedule_follow_up'
  | 'analyze_conversation_sentiment'
  // Calendar
  | 'create_booking_link'
  | 'suggest_meeting_times'
  // Meeting Scheduling
  | 'schedule_meeting'
  | 'find_free_slots'
  | 'check_meeting_conflicts'
  | 'reschedule_meeting'
  | 'cancel_meeting'
  // Talent Pool
  | 'search_talent_pool'
  | 'get_candidate_move_probability'
  | 'get_candidates_needing_attention'
  | 'log_candidate_touchpoint'
  | 'update_candidate_tier'
  // Communication Intelligence
  | 'search_communications'
  | 'get_entity_communication_summary'
  | 'get_relationship_health';

// ============= Tool Args Map =============

export interface ToolArgsMap {
  search_jobs: SearchJobsArgs;
  analyze_job_fit: AnalyzeJobFitArgs;
  apply_to_job: ApplyToJobArgs;
  generate_cover_letter: GenerateCoverLetterArgs;
  create_task: CreateTaskArgs;
  bulk_create_tasks: BulkCreateTasksArgs;
  reschedule_tasks: RescheduleTasksArgs;
  suggest_next_task: SuggestNextTaskArgs;
  analyze_task_load: Record<string, never>;
  generate_interview_questions: GenerateInterviewQuestionsArgs;
  research_company: ResearchCompanyArgs;
  create_interview_briefing: CreateInterviewBriefingArgs;
  draft_message: DraftMessageArgs;
  send_message: SendMessageArgs;
  schedule_follow_up: ScheduleFollowUpArgs;
  analyze_conversation_sentiment: AnalyzeConversationSentimentArgs;
  create_booking_link: CreateBookingLinkArgs;
  suggest_meeting_times: SuggestMeetingTimesArgs;
  schedule_meeting: ScheduleMeetingArgs;
  find_free_slots: FindFreeSlotsArgs;
  check_meeting_conflicts: CheckMeetingConflictsArgs;
  reschedule_meeting: RescheduleMeetingArgs;
  cancel_meeting: CancelMeetingArgs;
  search_talent_pool: SearchTalentPoolArgs;
  get_candidate_move_probability: GetCandidateMoveProbabilityArgs;
  get_candidates_needing_attention: GetCandidatesNeedingAttentionArgs;
  log_candidate_touchpoint: LogCandidateTouchpointArgs;
  update_candidate_tier: UpdateCandidateTierArgs;
  search_communications: SearchCommunicationsArgs;
  get_entity_communication_summary: GetEntityCommunicationSummaryArgs;
  get_relationship_health: GetRelationshipHealthArgs;
}

// ============= Tool Results Map =============

export interface ToolResultsMap {
  search_jobs: SearchJobsResult;
  analyze_job_fit: AnalyzeJobFitResult;
  apply_to_job: ApplyToJobResult;
  generate_cover_letter: GenerateCoverLetterResult;
  create_task: CreateTaskResult;
  bulk_create_tasks: BulkCreateTasksResult;
  reschedule_tasks: RescheduleTasksResult;
  suggest_next_task: SuggestNextTaskResult;
  analyze_task_load: AnalyzeTaskLoadResult;
  generate_interview_questions: GenerateInterviewQuestionsResult;
  research_company: ResearchCompanyResult;
  create_interview_briefing: CreateInterviewBriefingResult;
  draft_message: DraftMessageResult;
  send_message: SendMessageResult;
  schedule_follow_up: ScheduleFollowUpResult;
  analyze_conversation_sentiment: AnalyzeConversationSentimentResult;
  create_booking_link: CreateBookingLinkResult;
  suggest_meeting_times: SuggestMeetingTimesResult;
  schedule_meeting: ScheduleMeetingResult;
  find_free_slots: FindFreeSlotsResult;
  check_meeting_conflicts: CheckMeetingConflictsResult;
  reschedule_meeting: RescheduleMeetingResult;
  cancel_meeting: CancelMeetingResult;
  search_talent_pool: SearchTalentPoolResult;
  get_candidate_move_probability: GetCandidateMoveProbabilityResult;
  get_candidates_needing_attention: GetCandidatesNeedingAttentionResult;
  log_candidate_touchpoint: LogCandidateTouchpointResult;
  update_candidate_tier: UpdateCandidateTierResult;
  search_communications: SearchCommunicationsResult;
  get_entity_communication_summary: GetEntityCommunicationSummaryResult;
  get_relationship_health: GetRelationshipHealthResult;
}
