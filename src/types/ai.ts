/**
 * AI Service Types
 *
 * Type definitions for all AI-related operations including:
 * - Email assistance
 * - Text generation
 * - Sentiment analysis
 * - Semantic search
 * - Interview analysis
 * - Business intelligence
 * - Document generation
 */

// ============= Base Response Types =============

export interface AIServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============= Email Assistance =============

export type EmailAssistAction = 'compose' | 'improve' | 'shorten' | 'expand' | 'professional' | 'friendly';

export interface AssistEmailParams {
  action: EmailAssistAction;
  currentText: string;
  subject?: string;
  recipientEmail?: string;
}

export interface AssistEmailResponse {
  suggestion: string;
}

// ============= Text Generation =============

export type TextOperation = 'improve' | 'summarize' | 'expand' | 'translate' | 'generate' | 'simplify' | 'professional' | 'casual';

export interface GenerateTextParams {
  operation: TextOperation;
  text: string;
  context?: string;
  targetLanguage?: string;
  customPrompt?: string;
}

export interface GenerateTextResponse {
  result: string;
}

// ============= Sentiment Analysis =============

export type SentimentType = 'positive' | 'neutral' | 'negative';

export interface SentimentResult {
  sentiment: SentimentType;
  score: number;
  explanation: string;
}

// ============= Intent Classification =============

export interface ClassificationResult {
  intent_type: string;
  confidence: number;
  sub_intents: string[];
  suggested_action?: string;
  entities?: Record<string, string>;
}

// ============= Semantic Search =============

export type SearchEntityType = 'candidate' | 'job' | 'knowledge' | 'interaction' | 'company';

export interface SearchParams {
  query: string;
  entity_type: SearchEntityType;
  limit?: number;
  threshold?: number;
  filters?: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  entity_type: SearchEntityType;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export interface SearchResponse {
  results: SearchResult[];
  count: number;
  query_embedding?: number[];
}

// ============= Embeddings =============

export interface EmbeddingParams {
  text: string;
  entity_type?: SearchEntityType;
  entity_id?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
}

export interface BatchEmbeddingParams {
  entity_type: SearchEntityType;
  limit?: number;
  offset?: number;
}

export interface BatchEmbeddingResponse {
  processed: number;
  errors: number;
  failed_ids?: string[];
}

// ============= Transcription =============

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  speaker?: string;
  confidence?: number;
}

export interface TranscriptParams {
  meetingId: string;
  segments?: TranscriptSegment[];
}

export interface TranscriptResponse {
  transcript: string;
  segments: TranscriptSegment[];
  duration: number;
  speaker_count?: number;
}

export interface VoiceToTextParams {
  audio: string; // base64 encoded
  meetingId?: string;
  participantName?: string;
  timestamp?: string;
  language?: string;
}

export interface VoiceToTextResponse {
  text: string;
  confidence?: number;
  language?: string;
}

// ============= Interview Analysis =============

export interface JobData {
  position: string;
  company: string;
  description: string;
  skills: string[];
  interviewType?: string;
  experience_level?: string;
}

export interface AnalyzeInterviewParams {
  transcript: string;
  jobData: JobData;
  candidateId?: string;
}

export interface InterviewScore {
  communication_clarity: number;
  technical_depth: number;
  culture_fit: number;
  problem_solving: number;
  overall_impression: number;
}

export interface InterviewRedFlag {
  flag: string;
  severity: 'low' | 'medium' | 'high';
  timestamp?: string;
  context?: string;
}

export type HiringRecommendation = 'strong_hire' | 'hire' | 'maybe' | 'no_hire' | 'strong_no_hire';

export interface InterviewAnalysisResult {
  scores: InterviewScore;
  red_flags: InterviewRedFlag[];
  strengths: string[];
  concerns: string[];
  follow_up_questions: string[];
  recommendation: HiringRecommendation;
  summary?: string;
  key_moments?: Array<{
    timestamp: string;
    description: string;
    sentiment: SentimentType;
  }>;
}

export interface RealtimeAnalysisParams {
  meetingId: string;
  transcript: string;
  currentTime?: number;
}

export interface RealtimeAnalysisResponse {
  success: boolean;
  scores: Partial<InterviewScore>;
  suggestions?: string[];
  alerts?: string[];
}

// ============= Interview Preparation =============

export interface PrepParams {
  meetingId: string;
  candidateId: string;
  roleTitle: string;
  companyName: string;
}

export interface InterviewPrepBrief {
  candidate_summary: string;
  role_alignment: string[];
  suggested_questions: Array<{
    question: string;
    purpose: string;
    follow_ups?: string[];
  }>;
  talking_points: string[];
  areas_to_probe: string[];
  company_context?: string;
}

export interface CoachParams {
  candidateId: string;
  jobId: string;
  interviewerId?: string;
  interviewType?: string;
}

export interface InterviewCoachMaterial {
  preparation_checklist: string[];
  expected_questions: Array<{
    question: string;
    category: string;
    suggested_approach: string;
  }>;
  company_insights: string[];
  salary_negotiation_tips?: string[];
  follow_up_template?: string;
}

// ============= Recording Analysis =============

export interface AnalyzeRecordingParams {
  recordingId: string;
  meetingId?: string;
  options?: RecordingAnalysisOptions;
  reanalyze?: boolean;
}

export interface RecordingAnalysisOptions {
  include_transcript?: boolean;
  include_highlights?: boolean;
  include_sentiment?: boolean;
  include_topics?: boolean;
  include_action_items?: boolean;
}

export interface HighlightClip {
  start: number;
  end: number;
  title: string;
  description: string;
  importance: 'low' | 'medium' | 'high';
  topics?: string[];
}

export interface SpeakingMetrics {
  total_duration: number;
  speaking_time_by_participant: Record<string, number>;
  interruption_count: number;
  average_turn_duration: number;
  silence_percentage: number;
  talk_ratio?: Record<string, number>;
}

// ============= CRM & Messaging =============

export interface GenerateCrmReplyParams {
  prospect_id: string;
  context: string;
  tone?: 'professional' | 'friendly' | 'casual';
  goal?: string;
  previous_messages?: Array<{
    content: string;
    sender: 'us' | 'them';
    timestamp: string;
  }>;
}

export interface GenerateCrmReplyResponse {
  reply: string;
  subject?: string;
  follow_up_date?: string;
  confidence: number;
}

export interface GenerateWhatsappReplyParams {
  conversation_id: string;
  recent_messages: Array<{
    content: string;
    sender: string;
    timestamp: string;
  }>;
  context?: string;
  tone?: 'professional' | 'friendly' | 'casual';
}

export interface GenerateWhatsappReplyResponse {
  reply: string;
  suggested_quick_replies?: string[];
}

export interface GenerateQuickReplyParams {
  message_content: string;
  sender_name?: string;
  context?: string;
  num_options?: number;
}

export interface GenerateQuickReplyResponse {
  replies: string[];
}

export interface GenerateFollowUpParams {
  recipient_id: string;
  last_interaction_date: string;
  relationship_type: string;
  context?: string;
}

export interface GenerateFollowUpResponse {
  message: string;
  subject?: string;
  best_time_to_send?: string;
  channel_recommendation?: 'email' | 'whatsapp' | 'linkedin';
}

// ============= Business Intelligence =============

export interface GenerateInsightsParams {
  timeframe?: '24h' | '7d' | '30d' | '90d';
  userId?: string;
  filters?: Record<string, unknown>;
}

export interface ExecutiveBriefingParams {
  candidateId: string;
  jobId: string;
}

export interface ExecutiveBriefing {
  summary: string;
  key_strengths: string[];
  potential_concerns: string[];
  fit_score: number;
  recommendation: string;
  next_steps: string[];
  comparison_to_other_candidates?: string;
}

export interface CompanyInsightsParams {
  companyId: string;
  includeFinancials?: boolean;
  includeNews?: boolean;
}

export interface CompanyInsights {
  company_summary: string;
  industry_position: string;
  recent_news: Array<{
    title: string;
    summary: string;
    date: string;
    sentiment: SentimentType;
  }>;
  growth_indicators: string[];
  potential_concerns: string[];
  hiring_trends?: string;
}

export interface CareerInsightsParams {
  userId: string;
  includeSkillGap?: boolean;
  includeMarketData?: boolean;
}

export interface CareerInsights {
  career_trajectory: string;
  skill_gaps: Array<{
    skill: string;
    importance: 'low' | 'medium' | 'high';
    learning_resources?: string[];
  }>;
  market_opportunities: string[];
  salary_benchmark?: {
    current_range: { min: number; max: number };
    potential_range: { min: number; max: number };
    factors: string[];
  };
  recommended_actions: string[];
}

export interface KPIInsightsParams {
  kpis: KPIData[];
  domainHealth: number;
  period?: '7d' | '30d' | '90d';
}

export interface KPIData {
  name: string;
  value: number;
  target?: number;
  trend?: 'up' | 'down' | 'stable';
  category?: string;
}

export interface KPIInsights {
  summary: string;
  alerts: Array<{
    kpi: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
  }>;
  recommendations: string[];
  predictions?: Array<{
    kpi: string;
    predicted_value: number;
    confidence: number;
  }>;
}

export interface ActivityInsights {
  summary: string;
  highlights: string[];
  areas_of_focus: string[];
  productivity_score: number;
  suggestions: string[];
}

export interface RoleAnalytics {
  role: string;
  performance_metrics: Record<string, number>;
  peer_comparison?: string;
  growth_areas: string[];
  achievements: string[];
}

// ============= Document Generation =============

export interface GenerateDossierParams {
  candidateId: string;
  jobId: string;
  sections?: string[];
  format?: 'pdf' | 'html' | 'markdown';
}

export interface CandidateDossier {
  candidate_summary: string;
  experience_overview: string;
  skills_assessment: Record<string, number>;
  interview_history?: Array<{
    date: string;
    role: string;
    outcome: string;
    notes: string;
  }>;
  recommendation: string;
  generated_at: string;
}

export interface MeetingDossierParams {
  recordingId: string;
  meetingId?: string;
  candidateId?: string;
  options?: {
    include_transcript?: boolean;
    include_analysis?: boolean;
    include_action_items?: boolean;
  };
}

export interface MeetingDossier {
  meeting_summary: string;
  key_discussion_points: string[];
  action_items: Array<{
    task: string;
    assignee?: string;
    due_date?: string;
  }>;
  decisions_made: string[];
  follow_up_items: string[];
  transcript_excerpt?: string;
}

export interface InterviewReportParams {
  meetingId: string;
  candidateId: string;
  roleTitle?: string;
  companyName?: string;
}

export interface InterviewReport {
  candidate_name: string;
  position: string;
  interview_date: string;
  interviewers: string[];
  overall_rating: number;
  scores: InterviewScore;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: HiringRecommendation;
  next_steps: string[];
}

export interface OfferRecommendationParams {
  candidate_id: string;
  job_id: string;
}

export interface OfferRecommendation {
  recommended_salary: {
    base: number;
    bonus?: number;
    equity?: string;
  };
  justification: string;
  market_comparison: string;
  negotiation_tips: string[];
  benefits_to_highlight: string[];
}

// ============= Campaign & Outreach =============

export interface CampaignAutopilotParams {
  goal: string;
  target_audience: string;
  industry?: string;
  sender_name?: string;
}

export interface CampaignAutopilotResponse {
  campaign_name: string;
  email_sequence: Array<{
    subject: string;
    body: string;
    delay_days: number;
  }>;
  target_personas: string[];
  estimated_response_rate: number;
  a_b_test_suggestions?: string[];
}

export interface ABTestVariantsParams {
  campaign_id: string;
  element_to_test: 'subject' | 'body' | 'cta' | 'timing';
  num_variants?: number;
}

export interface ABTestVariantsResponse {
  variants: Array<{
    variant_id: string;
    content: string;
    hypothesis: string;
  }>;
  test_duration_recommendation: number;
  success_metrics: string[];
}

// ============= Agent & Task Management =============

export interface AgentTaskParams {
  description: string;
  priority: number;
  required_skills?: string[];
  task_type?: string;
  metadata?: Record<string, unknown>;
  deadline?: string;
}

export interface AgentTaskResponse {
  task_id: string;
  assigned_agent?: string;
  estimated_completion: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
}

export interface ExtractTasksParams {
  message_content: string;
  message_id: string;
  source: string;
  sender_id?: string;
}

export interface ExtractedTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  assignee_suggestion?: string;
}

export interface ExtractTasksResponse {
  tasks: ExtractedTask[];
  confidence: number;
}

// ============= Sentinel (Real-time Monitoring) =============

export interface SentinelParams {
  transcript_chunk: string;
  candidate_id?: string;
  session_id?: string;
}

export interface SentinelAlert {
  type: 'red_flag' | 'concern' | 'positive' | 'action_needed';
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  suggested_action?: string;
}

export interface SentinelResponse {
  alerts: SentinelAlert[];
  sentiment_trend: 'improving' | 'stable' | 'declining';
  engagement_score: number;
}

// ============= Voice Session =============

export interface VoiceSessionParams {
  jobData?: JobData;
  agentId?: string;
  mode?: 'interview' | 'coaching' | 'practice';
}

export interface VoiceSessionResponse {
  session_id: string;
  websocket_url: string;
  initial_prompt?: string;
}

// ============= QUIN (AI Assistant) =============

export interface QuinParams {
  command: string;
  meetingId?: string;
  context?: QuinContext;
}

export interface QuinContext {
  current_page?: string;
  selected_entity?: {
    type: string;
    id: string;
  };
  user_role?: string;
  recent_actions?: string[];
}

export interface QuinResponse {
  response: string;
  actions?: Array<{
    type: string;
    params: Record<string, unknown>;
  }>;
  suggestions?: string[];
  follow_up_questions?: string[];
}

// ============= Social & Content =============

export interface GeneratePostParams {
  topic: string;
  tone?: 'professional' | 'casual' | 'inspirational' | 'educational';
  platform?: 'linkedin' | 'twitter' | 'internal';
  length?: 'short' | 'medium' | 'long';
  include_hashtags?: boolean;
}

export interface GeneratePostResponse {
  content: string;
  hashtags?: string[];
  best_posting_time?: string;
  engagement_prediction?: number;
}

export interface PostSummaryParams {
  post_id: string;
  include_comments?: boolean;
}

export interface PostSummary {
  summary: string;
  key_points: string[];
  sentiment: SentimentType;
  engagement_analysis: string;
}

// ============= Translation =============

export interface TranslateParams {
  text: string;
  source_language?: string;
  target_language: string;
  preserve_formatting?: boolean;
}

export interface TranslateResponse {
  translated_text: string;
  detected_source_language?: string;
  confidence: number;
}

// ============= Daily Challenges =============

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  xp_reward: number;
  time_limit_minutes?: number;
}

export interface DailyChallengesResponse {
  challenges: DailyChallenge[];
  streak_bonus?: number;
  special_event?: string;
}
