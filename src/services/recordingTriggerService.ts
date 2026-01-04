/**
 * Recording Trigger Service
 * Smart session recording based on user context and events
 * Optimized for PostHog free tier (5K recordings/month)
 */

import { posthog, startRecording, stopRecording } from '@/lib/posthog';

// Recording trigger configuration
const RECORDING_CONFIG = {
  // New users get 100% recording for first 7 days
  newUserThresholdDays: 7,
  // Regular users get sampled at 5%
  regularUserSampleRate: 0.05,
  // Always record on errors
  recordOnError: true,
  // Always record rage clicks (frustration)
  recordOnRageClick: true,
};

// Local storage keys
const STORAGE_KEYS = {
  firstSeen: 'tqc_first_seen',
  recordingActive: 'tqc_recording_active',
  errorTriggered: 'tqc_error_triggered',
};

/**
 * Check if user is new (within threshold days)
 */
export function isNewUser(): boolean {
  const firstSeen = localStorage.getItem(STORAGE_KEYS.firstSeen);
  
  if (!firstSeen) {
    localStorage.setItem(STORAGE_KEYS.firstSeen, Date.now().toString());
    return true;
  }
  
  const daysSinceFirstSeen = (Date.now() - parseInt(firstSeen)) / (1000 * 60 * 60 * 24);
  return daysSinceFirstSeen <= RECORDING_CONFIG.newUserThresholdDays;
}

/**
 * Check if user is internal team (should not record)
 */
export function isInternalUser(email?: string): boolean {
  if (!email) return false;
  const internalDomains = ['thequantumclub.nl', 'thequantumclub.com'];
  return internalDomains.some(domain => email.endsWith(`@${domain}`));
}

/**
 * Determine if session should be recorded based on smart sampling
 */
export function shouldRecordSession(userEmail?: string, userRole?: string): boolean {
  // Never record internal users
  if (isInternalUser(userEmail)) {
    return false;
  }
  
  // Never record admin sessions (internal operations)
  if (userRole === 'admin') {
    return false;
  }
  
  // Always record new users
  if (isNewUser()) {
    return true;
  }
  
  // Check if error-triggered recording is active
  if (sessionStorage.getItem(STORAGE_KEYS.errorTriggered) === 'true') {
    return true;
  }
  
  // Sample regular users
  return Math.random() < RECORDING_CONFIG.regularUserSampleRate;
}

/**
 * Trigger recording when an error occurs
 */
export function triggerRecordingOnError(error: Error | string): void {
  if (!RECORDING_CONFIG.recordOnError) return;
  
  // Mark session as error-triggered
  sessionStorage.setItem(STORAGE_KEYS.errorTriggered, 'true');
  
  // Start recording
  startRecording();
  
  // Track the error event
  posthog.capture('error_occurred', {
    error_message: typeof error === 'string' ? error : error.message,
    error_stack: typeof error === 'string' ? undefined : error.stack,
    recording_triggered: true,
  });
}

/**
 * Trigger recording on frustration signal (rage click, etc.)
 */
export function triggerRecordingOnFrustration(
  signalType: 'rage_click' | 'dead_click' | 'form_abandon' | 'error_shown',
  context?: Record<string, unknown>
): void {
  if (!RECORDING_CONFIG.recordOnRageClick) return;
  
  // Start recording if not already active
  startRecording();
  
  // Track frustration event
  posthog.capture('frustration_detected', {
    signal_type: signalType,
    recording_triggered: true,
    ...context,
  });
}

/**
 * Trigger recording for support ticket context
 */
export function triggerRecordingForSupport(ticketId?: string): void {
  startRecording();
  
  posthog.capture('support_recording_started', {
    ticket_id: ticketId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Initialize smart recording based on user context
 */
export function initializeSmartRecording(
  userEmail?: string,
  userRole?: string
): void {
  const shouldRecord = shouldRecordSession(userEmail, userRole);
  
  if (shouldRecord) {
    startRecording();
    localStorage.setItem(STORAGE_KEYS.recordingActive, 'true');
  } else {
    stopRecording();
    localStorage.setItem(STORAGE_KEYS.recordingActive, 'false');
  }
}

/**
 * Get recording status for debugging
 */
export function getRecordingStatus(): {
  isRecording: boolean;
  isNewUser: boolean;
  isInternal: boolean;
  errorTriggered: boolean;
} {
  return {
    isRecording: localStorage.getItem(STORAGE_KEYS.recordingActive) === 'true',
    isNewUser: isNewUser(),
    isInternal: false, // Would need email context
    errorTriggered: sessionStorage.getItem(STORAGE_KEYS.errorTriggered) === 'true',
  };
}
