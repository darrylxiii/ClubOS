import { supabase } from '@/integrations/supabase/client';

/**
 * Get or create a session ID for the current browser session
 */
export const getSessionId = (): string => {
  const key = 'activity_session_id';
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
};

/**
 * Get session start time
 */
export const getSessionStartTime = (): Date => {
  const key = 'activity_session_start';
  let startTime = sessionStorage.getItem(key);
  
  if (!startTime) {
    startTime = new Date().toISOString();
    sessionStorage.setItem(key, startTime);
  }
  
  return new Date(startTime);
};

/**
 * Calculate current session duration in minutes
 */
export const getSessionDuration = (): number => {
  const startTime = getSessionStartTime();
  const now = new Date();
  return Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
};

/**
 * Detect device type from user agent
 */
export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

/**
 * Track a detailed user event
 */
export const trackEvent = async (
  userId: string,
  eventType: string,
  options?: {
    eventCategory?: string;
    actionData?: Record<string, any>;
    pagePath?: string;
    referrer?: string;
    durationSeconds?: number;
  }
) => {
  try {
    const sessionId = getSessionId();
    const deviceType = getDeviceType();

    await (supabase as any).rpc('track_user_event', {
      p_user_id: userId,
      p_session_id: sessionId,
      p_event_type: eventType,
      p_event_category: options?.eventCategory || null,
      p_action_data: options?.actionData ? JSON.parse(JSON.stringify(options.actionData)) : null,
      p_page_path: options?.pagePath || window.location.pathname,
      p_referrer: options?.referrer || document.referrer || null,
      p_device_type: deviceType,
      p_duration_seconds: options?.durationSeconds || null,
    });
  } catch (error) {
    console.error('Error tracking event:', error);
  }
};

/**
 * Track login event
 */
export const trackLogin = async (userId: string, method: 'email' | 'google' | 'linkedin' = 'email') => {
  try {
    // Reset session tracking on login
    sessionStorage.removeItem('activity_session_id');
    sessionStorage.removeItem('activity_session_start');
    
    const sessionId = getSessionId();
    
    // Track login event
    await trackEvent(userId, 'login', {
      eventCategory: 'auth',
      actionData: { method },
    });

    // Update activity tracking with login flag
    await (supabase as any).rpc('update_user_activity_tracking', {
      p_user_id: userId,
      p_action_type: 'login',
      p_increment_actions: true,
      p_session_id: sessionId,
      p_is_login: true,
      p_is_logout: false,
      p_session_duration_minutes: null,
    });
  } catch (error) {
    console.error('[Session Tracking] Failed to track login:', error);
    throw error; // Re-throw so caller can handle
  }
};

/**
 * Track logout event
 */
export const trackLogout = async (userId: string) => {
  try {
    const sessionDuration = getSessionDuration();
    const sessionId = getSessionId();

    // Track logout event
    await trackEvent(userId, 'logout', {
      eventCategory: 'auth',
      actionData: { session_duration_minutes: sessionDuration },
    });

    // Update activity tracking with logout flag
    await (supabase as any).rpc('update_user_activity_tracking', {
      p_user_id: userId,
      p_action_type: 'logout',
      p_increment_actions: true,
      p_session_id: sessionId,
      p_is_login: false,
      p_is_logout: true,
      p_session_duration_minutes: sessionDuration,
    });

    // Clear session tracking
    sessionStorage.removeItem('activity_session_id');
    sessionStorage.removeItem('activity_session_start');
  } catch (error) {
    console.error('[Session Tracking] Failed to track logout:', error);
    throw error; // Re-throw so caller can handle
  }
};

/**
 * Track page view
 */
export const trackPageView = async (userId: string, pagePath?: string) => {
  await trackEvent(userId, 'page_view', {
    eventCategory: 'navigation',
    pagePath: pagePath || window.location.pathname,
  });
};

/**
 * Track job interaction
 */
export const trackJobInteraction = async (
  userId: string,
  jobId: string,
  action: 'view' | 'save' | 'apply' | 'unsave'
) => {
  await trackEvent(userId, `job_${action}`, {
    eventCategory: 'jobs',
    actionData: { job_id: jobId, action },
  });
};

/**
 * Track candidate interaction
 */
export const trackCandidateInteraction = async (
  userId: string,
  candidateId: string,
  action: 'view_profile' | 'shortlist' | 'message' | 'schedule_interview' | 'advance' | 'reject'
) => {
  await trackEvent(userId, action, {
    eventCategory: 'candidate_management',
    actionData: { candidate_id: candidateId, action },
  });
};

/**
 * Track message sent
 */
export const trackMessageSent = async (
  userId: string,
  recipientId: string,
  category: 'candidate' | 'partner' | 'support'
) => {
  await trackEvent(userId, 'message_sent', {
    eventCategory: 'messaging',
    actionData: { recipient_id: recipientId, category },
  });
};

/**
 * Track document interaction
 */
export const trackDocumentInteraction = async (
  userId: string,
  documentId: string,
  action: 'upload' | 'download' | 'share' | 'archive'
) => {
  await trackEvent(userId, `document_${action}`, {
    eventCategory: 'documents',
    actionData: { document_id: documentId, action },
  });
};

/**
 * Track profile update
 */
export const trackProfileUpdate = async (
  userId: string,
  fieldsUpdated: string[]
) => {
  await trackEvent(userId, 'profile_update', {
    eventCategory: 'profile',
    actionData: { fields_updated: fieldsUpdated },
  });
};

/**
 * Track assessment interaction
 */
export const trackAssessmentInteraction = async (
  userId: string,
  assessmentId: string,
  action: 'start' | 'submit' | 'review'
) => {
  await trackEvent(userId, `assessment_${action}`, {
    eventCategory: 'assessments',
    actionData: { assessment_id: assessmentId, action },
  });
};
