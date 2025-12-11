/**
 * Instantly API V2 Client
 * Shared client with rate limiting and error handling
 */

const INSTANTLY_API_BASE = 'https://api.instantly.ai/api/v2';
const RATE_LIMIT_PER_MINUTE = 150;

interface InstantlyRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  params?: Record<string, string | number | boolean | undefined>;
}

interface InstantlyResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// Rate limiting state
let requestCount = 0;
let windowStart = Date.now();

async function checkRateLimit(): Promise<void> {
  const now = Date.now();
  if (now - windowStart >= 60000) {
    // Reset window
    requestCount = 0;
    windowStart = now;
  }
  
  if (requestCount >= RATE_LIMIT_PER_MINUTE) {
    // Wait until window resets
    const waitTime = 60000 - (now - windowStart) + 100;
    console.log(`[Instantly] Rate limit reached, waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    requestCount = 0;
    windowStart = Date.now();
  }
  
  requestCount++;
}

export async function instantlyRequest<T>(
  endpoint: string,
  options: InstantlyRequestOptions = {}
): Promise<InstantlyResponse<T>> {
  const apiKey = Deno.env.get('InstantlyAPI');
  
  if (!apiKey) {
    return { error: 'Instantly API key not configured', status: 500 };
  }

  await checkRateLimit();

  const { method = 'GET', body, params } = options;
  
  // Build URL with query params
  let url = `${INSTANTLY_API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  try {
    console.log(`[Instantly] ${method} ${endpoint}`);
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(`[Instantly] Error ${response.status}:`, responseData);
      return {
        error: responseData?.message || responseData?.error || `HTTP ${response.status}`,
        status: response.status,
      };
    }

    return { data: responseData as T, status: response.status };
  } catch (error) {
    console.error('[Instantly] Request failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Request failed',
      status: 500,
    };
  }
}

// =====================================================
// Campaign Endpoints
// =====================================================

export interface InstantlyCampaign {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  account_id?: string;
  daily_limit?: number;
  email_gap?: number;
  // Analytics
  leads_count?: number;
  sent_count?: number;
  open_count?: number;
  click_count?: number;
  reply_count?: number;
  bounce_count?: number;
  unsubscribe_count?: number;
}

export interface ListCampaignsParams {
  limit?: number;
  starting_after?: string;
  status?: 'active' | 'paused' | 'completed' | 'draft';
}

export async function listCampaigns(params: ListCampaignsParams = {}) {
  return instantlyRequest<{ items: InstantlyCampaign[]; has_more: boolean; next_starting_after?: string }>('/campaigns', {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

export async function getCampaign(campaignId: string) {
  return instantlyRequest<InstantlyCampaign>(`/campaigns/${campaignId}`);
}

// Campaign Analytics Response from Instantly API V2
// Exact field names from: https://developer.instantly.ai/api/v2/campaign/getcampaignanalyticsoverview
export interface CampaignAnalytics {
  campaign_id: string;
  campaign_name: string;
  campaign_status: number; // 0=Draft, 1=Active, 2=Paused, 3=Completed, 4=Running Subsequences, -99=Account Suspended, -1=Accounts Unhealthy, -2=Bounce Protect
  campaign_is_evergreen?: boolean;
  leads_count: number;
  contacted_count: number;
  open_count: number;
  reply_count: number;
  link_click_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  completed_count: number;
  emails_sent_count: number;
  new_leads_contacted_count: number;
  total_opportunities: number;
  total_opportunity_value: number;
  // Unique metrics
  open_count_unique?: number;
  reply_count_unique?: number;
  link_click_count_unique?: number;
}

// Map numeric status to string
export function mapCampaignStatus(status: number): string {
  const statusMap: Record<number, string> = {
    0: 'draft',
    1: 'active',
    2: 'paused',
    3: 'completed',
    4: 'active', // Running Subsequences - treat as active
    [-1]: 'error', // Accounts Unhealthy
    [-2]: 'paused', // Bounce Protect
  };
  return statusMap[status] || 'unknown';
}

export async function getCampaignAnalytics(campaignId: string) {
  // Correct endpoint: /campaigns/analytics with query param
  return instantlyRequest<CampaignAnalytics>('/campaigns/analytics', {
    params: { id: campaignId },
  });
}

// Get analytics for ALL campaigns in one API call (more efficient)
export async function getAllCampaignsAnalytics() {
  return instantlyRequest<CampaignAnalytics[]>('/campaigns/analytics');
}

// =====================================================
// Sequence Step Analytics (Phase 2)
// =====================================================

export interface SequenceStepAnalytics {
  step_number: number;
  variant_id?: string;
  variant_label?: string;
  subject_line?: string;
  sent_count: number;
  open_count: number;
  reply_count: number;
  click_count: number;
  bounce_count: number;
  open_rate?: number;
  reply_rate?: number;
  click_rate?: number;
}

export interface CampaignSequenceAnalytics {
  campaign_id: string;
  campaign_name: string;
  steps: SequenceStepAnalytics[];
}

// Get sequence step analytics for a specific campaign
export async function getCampaignSequenceSteps(campaignId: string) {
  return instantlyRequest<CampaignSequenceAnalytics>('/campaigns/analytics/steps', {
    params: { id: campaignId },
  });
}

// =====================================================
// Lead Endpoints
// =====================================================

export interface InstantlyLead {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
  website?: string;
  custom_variables?: Record<string, string>;
  status: string;
  lead_status?: string;
  campaign_id: string;
  // Engagement
  sent_count?: number;
  open_count?: number;
  click_count?: number;
  reply_count?: number;
  is_bounced?: boolean;
  is_unsubscribed?: boolean;
  last_contacted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ListLeadsParams {
  campaign_id?: string;
  limit?: number;
  starting_after?: string;
  email?: string;
  status?: string;
}

export async function listLeads(params: ListLeadsParams = {}) {
  return instantlyRequest<{ items: InstantlyLead[]; has_more: boolean; next_starting_after?: string }>('/leads', {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

export async function getLead(leadId: string) {
  return instantlyRequest<InstantlyLead>(`/leads/${leadId}`);
}

export async function getLeadByEmail(email: string, campaignId?: string) {
  return instantlyRequest<InstantlyLead>('/leads/email', {
    params: { email, campaign_id: campaignId },
  });
}

export interface CreateLeadParams {
  campaign_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
  website?: string;
  custom_variables?: Record<string, string>;
}

export async function createLead(params: CreateLeadParams) {
  return instantlyRequest<InstantlyLead>('/leads', {
    method: 'POST',
    body: params as unknown as Record<string, unknown>,
  });
}

export async function updateLead(leadId: string, params: Partial<CreateLeadParams>) {
  return instantlyRequest<InstantlyLead>(`/leads/${leadId}`, {
    method: 'PATCH',
    body: params,
  });
}

export async function updateLeadStatus(leadId: string, status: string) {
  return instantlyRequest<InstantlyLead>(`/leads/${leadId}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

// =====================================================
// Email/Reply Endpoints
// =====================================================

export interface InstantlyEmail {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  sent_at: string;
  opened_at?: string;
  clicked_at?: string;
  replied_at?: string;
  is_reply: boolean;
  thread_id?: string;
}

export async function listEmails(leadId: string, params: { limit?: number; starting_after?: string } = {}) {
  return instantlyRequest<{ items: InstantlyEmail[]; has_more: boolean }>(`/leads/${leadId}/emails`, {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

export async function sendReply(params: {
  lead_id: string;
  body: string;
  subject?: string;
}) {
  return instantlyRequest<InstantlyEmail>('/emails/reply', {
    method: 'POST',
    body: params,
  });
}

// =====================================================
// Webhook Endpoints
// =====================================================

export interface InstantlyWebhook {
  id: string;
  url: string;
  event_types: string[];
  campaign_id?: string;
  is_active: boolean;
  created_at: string;
}

export const INSTANTLY_WEBHOOK_EVENTS = [
  'lead.created',
  'lead.updated',
  'lead.replied',
  'lead.interested',
  'lead.not_interested',
  'lead.meeting_booked',
  'lead.meeting_completed',
  'lead.out_of_office',
  'lead.wrong_person',
  'email.sent',
  'email.opened',
  'email.clicked',
  'email.bounced',
  'email.unsubscribed',
  'campaign.completed',
] as const;

export type InstantlyWebhookEvent = typeof INSTANTLY_WEBHOOK_EVENTS[number];

export async function listWebhooks() {
  return instantlyRequest<{ items: InstantlyWebhook[] }>('/webhooks');
}

export async function createWebhook(params: {
  url: string;
  event_types: InstantlyWebhookEvent[];
  campaign_id?: string;
}) {
  return instantlyRequest<InstantlyWebhook>('/webhooks', {
    method: 'POST',
    body: params,
  });
}

export async function deleteWebhook(webhookId: string) {
  return instantlyRequest<void>(`/webhooks/${webhookId}`, {
    method: 'DELETE',
  });
}

// =====================================================
// Account/Workspace Endpoints
// =====================================================

export interface InstantlyAccount {
  id: string;
  email: string;
  name: string;
  workspace_id: string;
  workspace_name: string;
}

export async function getAccount() {
  return instantlyRequest<InstantlyAccount>('/accounts/me');
}

// =====================================================
// Block List Endpoints
// =====================================================

export async function addToBlockList(emails: string[]) {
  return instantlyRequest<void>('/block-list', {
    method: 'POST',
    body: { emails },
  });
}

export async function removeFromBlockList(emails: string[]) {
  return instantlyRequest<void>('/block-list', {
    method: 'DELETE',
    body: { emails },
  });
}

// =====================================================
// Email Verification
// =====================================================

export interface VerificationResult {
  email: string;
  status: 'valid' | 'invalid' | 'risky' | 'unknown';
  reason?: string;
}

export async function verifyEmail(email: string) {
  return instantlyRequest<VerificationResult>('/email-verification/verify', {
    method: 'POST',
    body: { email },
  });
}

export async function verifyEmails(emails: string[]) {
  return instantlyRequest<{ results: VerificationResult[] }>('/email-verification/verify-bulk', {
    method: 'POST',
    body: { emails },
  });
}
