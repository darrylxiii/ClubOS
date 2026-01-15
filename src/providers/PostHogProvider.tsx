/**
 * PostHog Provider Component
 * Initializes PostHog and handles user identification
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  initPostHog, 
  identifyUser, 
  resetUser, 
  trackEvent,
  isFeatureEnabled,
  getFeatureFlag,
  getFeatureFlagPayload,
  reloadFeatureFlags,
  startRecording,
  stopRecording,
  optOut,
  optIn,
  hasOptedOut,
} from '@/lib/posthog';

// Routes where session recording should be disabled
const RECORDING_BLOCKED_ROUTES = [
  '/settings',
  '/billing',
  '/payment',
  '/admin/security',
];

interface PostHogContextValue {
  isInitialized: boolean;
  identify: (userId: string, properties?: {
    email?: string;
    name?: string;
    role?: string;
    companyId?: string;
    plan?: string;
  }) => void;
  reset: () => void;
  track: (eventName: string, properties?: Record<string, unknown>) => void;
  isFeatureEnabled: (flagKey: string) => boolean;
  getFeatureFlag: (flagKey: string) => string | boolean | undefined;
  getFeatureFlagPayload: (flagKey: string) => unknown;
  reloadFeatureFlags: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  optOut: () => void;
  optIn: () => void;
  hasOptedOut: () => boolean;
}

const PostHogContext = createContext<PostHogContextValue | null>(null);

interface PostHogProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export function PostHogProvider({ children, enabled = true }: PostHogProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const location = useLocation();

  // Initialize PostHog
  useEffect(() => {
    if (!enabled) return;
    
    initPostHog();
    setIsInitialized(true);
    
    // Mark first seen for new user detection
    if (!localStorage.getItem('tqc_first_seen')) {
      localStorage.setItem('tqc_first_seen', Date.now().toString());
    }
  }, [enabled]);

  // Handle route changes for recording control
  useEffect(() => {
    if (!isInitialized) return;

    const shouldBlockRecording = RECORDING_BLOCKED_ROUTES.some(
      route => location.pathname.startsWith(route)
    );

    if (shouldBlockRecording) {
      stopRecording();
    } else {
      startRecording();
    }

    // Track page view
    trackEvent('$pageview', {
      path: location.pathname,
      search: location.search,
    });
  }, [location.pathname, location.search, isInitialized]);

  const value: PostHogContextValue = {
    isInitialized,
    identify: identifyUser,
    reset: resetUser,
    track: trackEvent,
    isFeatureEnabled,
    getFeatureFlag,
    getFeatureFlagPayload,
    reloadFeatureFlags,
    startRecording,
    stopRecording,
    optOut,
    optIn,
    hasOptedOut,
  };

  return (
    <PostHogContext.Provider value={value}>
      {children}
    </PostHogContext.Provider>
  );
}

/**
 * Hook to access PostHog context
 */
export function usePostHog(): PostHogContextValue {
  const context = useContext(PostHogContext);
  if (!context) {
    throw new Error('usePostHog must be used within a PostHogProvider');
  }
  return context;
}

/**
 * Optional hook that returns null outside provider
 */
export function useOptionalPostHog(): PostHogContextValue | null {
  return useContext(PostHogContext);
}
