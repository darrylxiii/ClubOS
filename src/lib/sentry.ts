/**
 * Sentry Error Tracking & Performance Monitoring
 * Phase 1.1: Enterprise-grade observability
 */

import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

/**
 * Initialize Sentry with performance monitoring and session replay
 */
export const initSentry = () => {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: `tqc@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Performance Monitoring - 10% in prod, 100% in dev
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    
    // Session Replay - 10% of sessions, 100% on error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Error filtering - ignore common non-actionable errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error exception captured',
      /^Network Error$/,
      /^AbortError$/,
      /^ChunkLoadError$/,
      'Loading chunk',
      'Failed to fetch dynamically imported module',
    ],
    
    beforeSend(event, hint) {
      // Don't send events in development unless debug mode is enabled
      if (import.meta.env.DEV && !import.meta.env.VITE_SENTRY_DEBUG) {
        console.log('[Sentry] Event captured (dev mode):', event);
        return null;
      }
      return event;
    },
  });
  
  console.log('[Sentry] Initialized successfully');
};

/**
 * Set user context for error tracking
 */
export const setSentryUser = (user: { id: string; email?: string; role?: string } | null) => {
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email, role: user.role });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Capture custom error with context
 */
export const captureError = (error: Error, context?: Record<string, unknown>) => {
  Sentry.captureException(error, { extra: context });
};

/**
 * Add navigation breadcrumb
 */
export const addBreadcrumb = (message: string, category: string, data?: Record<string, unknown>) => {
  Sentry.addBreadcrumb({ message, category, data, level: 'info' });
};

/**
 * Start a custom transaction for performance tracking
 */
export const startTransaction = (name: string, op: string) => {
  return Sentry.startInactiveSpan({ name, op });
};

/**
 * Set a custom tag on the current scope
 */
export const setTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};

/**
 * Set extra context data
 */
export const setExtra = (key: string, value: unknown) => {
  Sentry.setExtra(key, value);
};

/**
 * Capture a message (non-error event)
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

export { Sentry };
