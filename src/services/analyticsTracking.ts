import { supabase } from "@/integrations/supabase/client";

// Generate a session ID for tracking
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

// Detect device type
const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

// Track page view
export async function trackPageView(userId: string, pagePath: string, category?: string) {
  try {
    // Using insert with cast to bypass type checking until types regenerate
    await (supabase as any).from('user_activity_events').insert({
      user_id: userId,
      event_type: 'page_view',
      event_category: category || 'general',
      page_path: pagePath,
      referrer: document.referrer,
      device_type: getDeviceType(),
      session_id: getSessionId(),
      event_metadata: {
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
      }
    });
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
}

// Track job search
export async function trackJobSearch(
  userId: string,
  searchQuery: string,
  filters: any,
  resultsCount: number
) {
  try {
    await (supabase as any).from('job_search_analytics').insert({
      user_id: userId,
      search_query: searchQuery,
      filters_applied: filters,
      results_count: resultsCount,
      session_id: getSessionId(),
    });
  } catch (error) {
    console.error('Failed to track job search:', error);
  }
}

// Track job interaction
export async function trackJobInteraction(
  userId: string,
  jobId: string,
  action: 'clicked' | 'saved' | 'applied'
) {
  try {
    await (supabase as any).from('user_activity_events').insert({
      user_id: userId,
      event_type: 'job_interaction',
      event_category: 'job',
      event_metadata: {
        job_id: jobId,
        action,
      },
      page_path: window.location.pathname,
      session_id: getSessionId(),
      device_type: getDeviceType(),
    });
  } catch (error) {
    console.error('Failed to track job interaction:', error);
  }
}

// Track profile view (when someone views a candidate's profile)
export async function trackProfileView(
  candidateId: string,
  viewerId: string,
  viewerRole: string,
  companyId?: string,
  jobId?: string
) {
  try {
    await (supabase as any).from('candidate_engagement_events').insert({
      candidate_id: candidateId,
      event_type: 'profile_view',
      performer_id: viewerId,
      performer_role: viewerRole,
      company_id: companyId,
      job_id: jobId,
      metadata: {
        source: window.location.pathname,
        device_type: getDeviceType(),
      }
    });
  } catch (error) {
    console.error('Failed to track profile view:', error);
  }
}

// Track CV download
export async function trackCVDownload(
  candidateId: string,
  downloaderId: string,
  downloaderRole: string,
  companyId?: string,
  jobId?: string
) {
  try {
    await (supabase as any).from('candidate_engagement_events').insert({
      candidate_id: candidateId,
      event_type: 'cv_download',
      performer_id: downloaderId,
      performer_role: downloaderRole,
      company_id: companyId,
      job_id: jobId,
      metadata: {
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Failed to track CV download:', error);
  }
}

// Track interview scheduled
export async function trackInterviewScheduled(
  applicationId: string,
  stage: string,
  scheduledAt: Date,
  interviewerIds: string[]
) {
  try {
    await (supabase as any).from('interview_performance').insert({
      application_id: applicationId,
      interview_stage: stage,
      scheduled_at: scheduledAt.toISOString(),
      interviewer_ids: interviewerIds,
    });
  } catch (error) {
    console.error('Failed to track interview:', error);
  }
}

// Track interview completion
export async function trackInterviewCompletion(
  interviewId: string,
  completedAt: Date,
  durationMinutes: number,
  scores?: {
    rating?: number;
    feedback_score?: number;
    technical_score?: number;
    cultural_fit_score?: number;
    communication_score?: number;
  }
) {
  try {
    await (supabase as any).from('interview_performance').update({
      completed_at: completedAt.toISOString(),
      duration_minutes: durationMinutes,
      ...scores,
    }).eq('id', interviewId);
  } catch (error) {
    console.error('Failed to track interview completion:', error);
  }
}

// Track offer sent
export async function trackOfferSent(
  applicationId: string,
  jobId: string,
  candidateId: string,
  salaryOffered: number
) {
  try {
    await (supabase as any).from('offer_analytics').insert({
      application_id: applicationId,
      job_id: jobId,
      candidate_id: candidateId,
      offered_at: new Date().toISOString(),
      salary_offered: salaryOffered,
      decision: 'pending',
    });
  } catch (error) {
    console.error('Failed to track offer:', error);
  }
}

// Track offer response
export async function trackOfferResponse(
  offerId: string,
  decision: 'accepted' | 'declined' | 'countered',
  declineReason?: string,
  salaryRequested?: number,
  otherOffersCount?: number
) {
  try {
    const respondedAt = new Date();
    const { data: offer } = await (supabase as any)
      .from('offer_analytics')
      .select('offered_at')
      .eq('id', offerId)
      .single();

    const timeToDecisionHours = offer?.offered_at 
      ? Math.round((respondedAt.getTime() - new Date(offer.offered_at).getTime()) / (1000 * 60 * 60))
      : 0;

    await (supabase as any).from('offer_analytics').update({
      responded_at: respondedAt.toISOString(),
      decision,
      decline_reason: declineReason,
      salary_requested: salaryRequested,
      other_offers_count: otherOffersCount,
      time_to_decision_hours: timeToDecisionHours,
    }).eq('id', offerId);
  } catch (error) {
    console.error('Failed to track offer response:', error);
  }
}

// Track message sent
export async function trackMessageSent(
  userId: string,
  recipientId: string,
  category: 'candidate' | 'partner' | 'support'
) {
  try {
    await (supabase as any).from('user_activity_events').insert({
      user_id: userId,
      event_type: 'message_sent',
      event_category: category,
      event_metadata: {
        recipient_id: recipientId,
        timestamp: new Date().toISOString(),
      },
      session_id: getSessionId(),
      device_type: getDeviceType(),
    });
  } catch (error) {
    console.error('Failed to track message:', error);
  }
}

// Batch track multiple events (for performance)
export async function batchTrackEvents(events: any[]) {
  try {
    await (supabase as any).from('user_activity_events').insert(events);
  } catch (error) {
    console.error('Failed to batch track events:', error);
  }
}
