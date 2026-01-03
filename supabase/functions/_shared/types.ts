/**
 * Shared types for Supabase Edge Functions
 * Import these in your edge functions for consistent typing
 */

// ============= Common Response Types =============

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// ============= Workflow Types =============

export type WorkflowEventType = 
  | 'application.created'
  | 'application.updated'
  | 'application.status_changed'
  | 'candidate.created'
  | 'candidate.updated'
  | 'interview.scheduled'
  | 'interview.completed'
  | 'offer.created'
  | 'offer.accepted'
  | 'hire.completed'
  | 'referral.created'
  | 'referral.hired';

export interface WorkflowEvent {
  type: WorkflowEventType;
  timestamp: string;
  entityId: string;
  entityType: 'application' | 'candidate' | 'interview' | 'offer' | 'hire' | 'referral';
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowAction {
  actionType: 'email' | 'notification' | 'webhook' | 'task' | 'update';
  target: string;
  payload: Record<string, unknown>;
  delay?: number; // milliseconds
  conditions?: WorkflowCondition[];
}

export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: unknown;
}

// ============= AI Analysis Types =============

export interface AIAnalysisRequest {
  prompt: string;
  context?: Record<string, unknown>;
  model?: 'google/gemini-2.5-flash' | 'google/gemini-2.5-pro' | 'openai/gpt-5' | 'openai/gpt-5-mini';
  maxTokens?: number;
  temperature?: number;
}

export interface AIAnalysisResult {
  success: boolean;
  content?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
  model?: string;
  latencyMs?: number;
}

export interface AIMatchResult {
  score: number;
  factors: {
    skillsOverlap: number;
    experienceMatch: number;
    compensationFit: number;
    locationMatch: number;
    cultureFit: number;
  };
  explanation: string;
  recommendations: string[];
}

// ============= Financial Types =============

export interface PlacementFeeData {
  applicationId: string;
  jobId: string;
  candidateId?: string;
  partnerCompanyId: string;
  feeAmount: number;
  feePercentage?: number;
  candidateSalary: number;
  currencyCode: string;
  status: 'pending' | 'invoiced' | 'paid' | 'cancelled';
  hiredDate: string;
}

export interface CommissionCalculation {
  employeeId: string;
  placementFeeId: string;
  baseAmount: number;
  tierId?: string;
  tierPercentage: number;
  grossAmount: number;
  netAmount?: number;
  status: 'pending' | 'approved' | 'paid';
}

export interface BackfillResult {
  found: number;
  created: number;
  skipped: number;
  errors: number;
  dryRun: boolean;
  errorDetails?: Array<{ id: string; error: string }>;
}

// ============= Notification Types =============

export interface NotificationPayload {
  type: 'email' | 'push' | 'sms' | 'in_app';
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  template: string;
  data: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface EmailPayload extends NotificationPayload {
  type: 'email';
  subject: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

// ============= Calendar Types =============

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  attendees: Array<{
    email: string;
    name?: string;
    status?: 'pending' | 'accepted' | 'declined' | 'tentative';
  }>;
  location?: string;
  meetingLink?: string;
  recurrence?: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  available: boolean;
  conflictingEvents?: string[];
}

// ============= Error Types =============

export class EdgeFunctionError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'EdgeFunctionError';
  }
}

export class ValidationError extends EdgeFunctionError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends EdgeFunctionError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends EdgeFunctionError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends EdgeFunctionError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends EdgeFunctionError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT', { retryAfter });
    this.name = 'RateLimitError';
  }
}
