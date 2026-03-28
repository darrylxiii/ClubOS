/**
 * PostHog Analytics Configuration
 * Core initialization and configuration for PostHog
 * Optimized for free tier (1M events, 5K recordings/month)
 *
 * PERF: posthog-js is dynamically imported to keep it out of the
 * critical-path bundle.  All public APIs are safe to call before
 * the SDK loads — they silently no-op until init completes.
 */

// PostHog configuration
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_API_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

// Internal domains to exclude from analytics
const INTERNAL_DOMAINS = ['thequantumclub.nl', 'thequantumclub.com'];

// Privacy-sensitive CSS selectors to mask
const MASKED_SELECTORS = [
  '[data-mask]',
  '[data-private]',
  'input[type="password"]',
  'input[name*="salary"]',
  'input[name*="phone"]',
  'input[name*="email"]',
  'input[name*="ssn"]',
  'input[name*="bank"]',
  '.salary-field',
  '.private-data',
  '.pii-field',
  '.compensation-data',
];

// Routes where recording should be disabled (privacy)
const BLOCKED_ROUTES = [
  '/settings',
  '/billing',
  '/payment',
  '/admin/security',
  '/admin/users',
];

// Low-value pages to reduce autocapture (save events)
const AUTOCAPTURE_EXCLUDED_PATHS = [
  '/docs',
  '/help',
  '/privacy',
  '/terms',
  '/legal',
];

// ---------------------------------------------------------------------------
// Lazy-loaded PostHog instance
// ---------------------------------------------------------------------------

type PostHogInstance = typeof import('posthog-js').default;
let ph: PostHogInstance | null = null;
let loadPromise: Promise<PostHogInstance | null> | null = null;

/** Lazy-load the posthog-js SDK (only once). */
function getPostHog(): Promise<PostHogInstance | null> {
  if (ph) return Promise.resolve(ph);
  if (loadPromise) return loadPromise;

  loadPromise = import('posthog-js')
    .then((mod) => {
      ph = mod.default;
      return ph;
    })
    .catch(() => {
      loadPromise = null;
      return null;
    });

  return loadPromise;
}

/**
 * Check if current user is internal team
 */
export function isInternalUser(email?: string): boolean {
  if (!email) return false;
  return INTERNAL_DOMAINS.some(domain => email.toLowerCase().endsWith(`@${domain}`));
}

/**
 * Initialize PostHog with privacy-compliant settings
 */
export function initPostHog(): void {
  if (!POSTHOG_KEY) {
    return;
  }

  getPostHog().then((posthog) => {
    if (!posthog || posthog.__loaded) return;

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
      loaded: (loadedPh) => {
        // Check if on blocked route
        const currentPath = window.location.pathname;
        if (BLOCKED_ROUTES.some(route => currentPath.startsWith(route))) {
          loadedPh.stopSessionRecording();
        }
      },
    });
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
  getPostHog().then((posthog) => {
    if (!posthog?.__loaded) return;

    // Skip tracking for internal users
    const isInternal = isInternalUser(properties?.email);
    if (isInternal) {
      posthog.opt_out_capturing();
      return;
    }

    posthog.identify(userId, {
      email: properties?.email,
      name: properties?.name,
      role: properties?.role,
      company_id: properties?.companyId,
      plan: properties?.plan,
      is_internal: isInternal,
      first_seen: localStorage.getItem('tqc_first_seen') || new Date().toISOString(),
    });

    if (properties?.role) {
      posthog.register({ user_role: properties.role });
    }
    if (properties?.companyId) {
      posthog.register({ company_id: properties.companyId });
    }
  });
}

/**
 * Reset user identity on logout
 */
export function resetUser(): void {
  if (ph?.__loaded) ph.reset();
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (ph?.__loaded) ph.capture(eventName, properties);
}

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flagKey: string): boolean {
  if (!ph?.__loaded) return false;
  return ph.isFeatureEnabled(flagKey) ?? false;
}

/**
 * Get feature flag variant/payload
 */
export function getFeatureFlag(flagKey: string): string | boolean | undefined {
  if (!ph?.__loaded) return undefined;
  return ph.getFeatureFlag(flagKey);
}

/**
 * Get feature flag payload
 */
export function getFeatureFlagPayload(flagKey: string): unknown {
  if (!ph?.__loaded) return undefined;
  return ph.getFeatureFlagPayload(flagKey);
}

/**
 * Reload feature flags
 */
export function reloadFeatureFlags(): void {
  if (ph?.__loaded) ph.reloadFeatureFlags();
}

/**
 * Start session recording manually
 */
export function startRecording(): void {
  if (ph?.__loaded) ph.startSessionRecording();
}

/**
 * Stop session recording
 */
export function stopRecording(): void {
  if (ph?.__loaded) ph.stopSessionRecording();
}

/**
 * Get current session recording URL
 */
export function getSessionRecordingUrl(): string | undefined {
  if (!ph?.__loaded) return undefined;
  return ph.get_session_replay_url();
}

/**
 * Opt user out of tracking
 */
export function optOut(): void {
  if (ph?.__loaded) ph.opt_out_capturing();
}

/**
 * Opt user back into tracking
 */
export function optIn(): void {
  if (ph?.__loaded) ph.opt_in_capturing();
}

/**
 * Check if user has opted out
 */
export function hasOptedOut(): boolean {
  if (!ph?.__loaded) return false;
  return ph.has_opted_out_capturing();
}

// NOTE: posthog instance is no longer exported directly.
// Use the named exports above instead.
