/**
 * PostHog Analytics Configuration
 * Core initialization and configuration for PostHog
 */

import posthog from 'posthog-js';

// PostHog configuration
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_API_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

// Privacy-sensitive CSS selectors to mask
const MASKED_SELECTORS = [
  '[data-mask]',
  '[data-private]',
  'input[type="password"]',
  'input[name*="salary"]',
  'input[name*="phone"]',
  'input[name*="email"]',
  '.salary-field',
  '.private-data',
  '.pii-field',
];

// Routes where recording should be disabled
const BLOCKED_ROUTES = [
  '/settings',
  '/billing',
  '/payment',
  '/admin/security',
];

/**
 * Initialize PostHog with privacy-compliant settings
 */
export function initPostHog(): void {
  if (!POSTHOG_KEY) {
    console.warn('[PostHog] API key not configured - analytics disabled');
    return;
  }

  // Check if already initialized
  if (posthog.__loaded) {
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    
    // Privacy settings
    respect_dnt: true,
    mask_all_text: false,
    mask_all_element_attributes: false,
    
    // Session recording
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: MASKED_SELECTORS.join(','),
      blockSelector: '[data-posthog-block]',
    },
    
    // Feature flags
    bootstrap: {},
    
    // Autocapture settings
    autocapture: {
      dom_event_allowlist: ['click', 'submit', 'change'],
      element_allowlist: ['a', 'button', 'form', 'input', 'select', 'textarea'],
      css_selector_allowlist: ['[data-track]', '.trackable'],
    },
    
    // Performance
    capture_pageview: true,
    capture_pageleave: true,
    
    // Callbacks
    loaded: (ph) => {
      console.log('[PostHog] Initialized successfully');
      
      // Check if on blocked route
      const currentPath = window.location.pathname;
      if (BLOCKED_ROUTES.some(route => currentPath.startsWith(route))) {
        ph.stopSessionRecording();
      }
    },
  });
}

/**
 * Identify a user after authentication
 */
export function identifyUser(
  userId: string,
  properties?: {
    email?: string;
    name?: string;
    role?: string;
    companyId?: string;
    plan?: string;
  }
): void {
  if (!posthog.__loaded) return;
  
  posthog.identify(userId, {
    email: properties?.email,
    name: properties?.name,
    role: properties?.role,
    company_id: properties?.companyId,
    plan: properties?.plan,
  });
  
  // Set super properties for all future events
  if (properties?.role) {
    posthog.register({ user_role: properties.role });
  }
  if (properties?.companyId) {
    posthog.register({ company_id: properties.companyId });
  }
}

/**
 * Reset user identity on logout
 */
export function resetUser(): void {
  if (!posthog.__loaded) return;
  posthog.reset();
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (!posthog.__loaded) return;
  posthog.capture(eventName, properties);
}

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flagKey: string): boolean {
  if (!posthog.__loaded) return false;
  return posthog.isFeatureEnabled(flagKey) ?? false;
}

/**
 * Get feature flag variant/payload
 */
export function getFeatureFlag(flagKey: string): string | boolean | undefined {
  if (!posthog.__loaded) return undefined;
  return posthog.getFeatureFlag(flagKey);
}

/**
 * Get feature flag payload
 */
export function getFeatureFlagPayload(flagKey: string): unknown {
  if (!posthog.__loaded) return undefined;
  return posthog.getFeatureFlagPayload(flagKey);
}

/**
 * Reload feature flags
 */
export function reloadFeatureFlags(): void {
  if (!posthog.__loaded) return;
  posthog.reloadFeatureFlags();
}

/**
 * Start session recording manually
 */
export function startRecording(): void {
  if (!posthog.__loaded) return;
  posthog.startSessionRecording();
}

/**
 * Stop session recording
 */
export function stopRecording(): void {
  if (!posthog.__loaded) return;
  posthog.stopSessionRecording();
}

/**
 * Get current session recording URL
 */
export function getSessionRecordingUrl(): string | undefined {
  if (!posthog.__loaded) return undefined;
  return posthog.get_session_replay_url();
}

/**
 * Opt user out of tracking
 */
export function optOut(): void {
  if (!posthog.__loaded) return;
  posthog.opt_out_capturing();
}

/**
 * Opt user back into tracking
 */
export function optIn(): void {
  if (!posthog.__loaded) return;
  posthog.opt_in_capturing();
}

/**
 * Check if user has opted out
 */
export function hasOptedOut(): boolean {
  if (!posthog.__loaded) return false;
  return posthog.has_opted_out_capturing();
}

// Export PostHog instance for advanced usage
export { posthog };
