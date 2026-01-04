/**
 * Unified Analytics Service
 * Bridges existing tracking with PostHog
 */

import { trackEvent as postHogTrack } from '@/lib/posthog';
import { trackEvent as supabaseTrack } from '@/services/sessionTracking';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  userId?: string;
}

// Event name mapping for consistency
const EVENT_MAPPINGS: Record<string, string> = {
  // Feature usage
  'feature_used': 'feature_usage',
  'feature.used': 'feature_usage',
  
  // Search events
  'search_performed': 'search',
  'search.performed': 'search',
  
  // Journey events
  'journey_step': 'journey_step_completed',
  'journey.step': 'journey_step_completed',
  
  // Application events
  'application.submitted': 'candidate_applied',
  'application_submitted': 'candidate_applied',
  
  // Interview events
  'interview.scheduled': 'interview_scheduled',
  'interview_scheduled': 'interview_scheduled',
  
  // Offer events
  'offer.created': 'offer_created',
  'offer_created': 'offer_created',
};

/**
 * Normalize event name for consistency
 */
function normalizeEventName(name: string): string {
  return EVENT_MAPPINGS[name] || name.toLowerCase().replace(/\./g, '_');
}

/**
 * Track an event to all analytics providers
 */
export async function track(event: AnalyticsEvent): Promise<void> {
  const normalizedName = normalizeEventName(event.name);
  
  // Track to PostHog
  postHogTrack(normalizedName, {
    ...event.properties,
    original_event_name: event.name,
  });
  
  // Track to Supabase if user is authenticated
  if (event.userId) {
    try {
      await supabaseTrack(event.userId, normalizedName, {
        actionData: event.properties as Record<string, unknown>,
      });
    } catch (error) {
      console.warn('[Analytics] Supabase tracking failed:', error);
    }
  }
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(
  featureName: string,
  properties?: Record<string, unknown>,
  userId?: string
): void {
  track({
    name: 'feature_usage',
    properties: {
      feature_name: featureName,
      ...properties,
    },
    userId,
  });
}

/**
 * Track search performed
 */
export function trackSearch(
  query: string,
  resultCount: number,
  properties?: Record<string, unknown>,
  userId?: string
): void {
  track({
    name: 'search',
    properties: {
      query,
      result_count: resultCount,
      ...properties,
    },
    userId,
  });
}

/**
 * Track journey/funnel step
 */
export function trackJourneyStep(
  journeyName: string,
  stepName: string,
  stepIndex: number,
  properties?: Record<string, unknown>,
  userId?: string
): void {
  track({
    name: 'journey_step_completed',
    properties: {
      journey_name: journeyName,
      step_name: stepName,
      step_index: stepIndex,
      ...properties,
    },
    userId,
  });
}

/**
 * Track frustration signal (rage clicks, errors)
 */
export function trackFrustration(
  signalType: 'rage_click' | 'error' | 'slow_load' | 'form_abandon',
  properties?: Record<string, unknown>,
  userId?: string
): void {
  track({
    name: 'frustration_detected',
    properties: {
      signal_type: signalType,
      ...properties,
    },
    userId,
  });
}

/**
 * Track candidate application
 */
export function trackCandidateApplied(
  jobId: string,
  source: string,
  matchScore?: number,
  properties?: Record<string, unknown>,
  userId?: string
): void {
  track({
    name: 'candidate_applied',
    properties: {
      job_id: jobId,
      source,
      match_score: matchScore,
      ...properties,
    },
    userId,
  });
}

/**
 * Track interview scheduled
 */
export function trackInterviewScheduled(
  applicationId: string,
  interviewType: string,
  stage: string,
  properties?: Record<string, unknown>,
  userId?: string
): void {
  track({
    name: 'interview_scheduled',
    properties: {
      application_id: applicationId,
      interview_type: interviewType,
      stage,
      ...properties,
    },
    userId,
  });
}

/**
 * Track offer created
 */
export function trackOfferCreated(
  applicationId: string,
  salaryBand?: string,
  roleLevel?: string,
  properties?: Record<string, unknown>,
  userId?: string
): void {
  track({
    name: 'offer_created',
    properties: {
      application_id: applicationId,
      salary_band: salaryBand,
      role_level: roleLevel,
      ...properties,
    },
    userId,
  });
}

/**
 * Track Club Sync (auto-apply) usage
 */
export function trackClubSync(
  candidateId: string,
  jobIds: string[],
  properties?: Record<string, unknown>,
  userId?: string
): void {
  track({
    name: 'club_sync_triggered',
    properties: {
      candidate_id: candidateId,
      job_count: jobIds.length,
      job_ids: jobIds,
      ...properties,
    },
    userId,
  });
}

/**
 * Track dossier view
 */
export function trackDossierViewed(
  dossierId: string,
  viewerId: string,
  viewerRole: string,
  properties?: Record<string, unknown>
): void {
  track({
    name: 'dossier_viewed',
    properties: {
      dossier_id: dossierId,
      viewer_id: viewerId,
      viewer_role: viewerRole,
      ...properties,
    },
    userId: viewerId,
  });
}

// Export for convenience
export { postHogTrack as trackToPostHog };
