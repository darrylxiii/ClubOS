/**
 * Feature Flag Hooks
 * Type-safe hooks for PostHog feature flags
 */

import { useState, useEffect, useCallback } from 'react';
import { useOptionalPostHog } from '@/providers/PostHogProvider';
import { 
  isFeatureEnabled, 
  getFeatureFlag, 
  getFeatureFlagPayload,
  posthog,
} from '@/lib/posthog';

// Define known feature flags for type safety
export type FeatureFlagKey =
  | 'pilot_enabled'
  | 'dossier_sharing_v2'
  | 'ghost_mode'
  | 'drops_engine'
  | 'quin_enhanced'
  | 'club_sync_v2'
  | 'ai_matching'
  | 'new_onboarding'
  | 'dark_mode_v2'
  | string; // Allow custom flags

interface UseFeatureFlagResult {
  enabled: boolean;
  loading: boolean;
}

/**
 * Check if a feature flag is enabled
 */
export function useFeatureFlag(
  flagKey: FeatureFlagKey,
  defaultValue: boolean = false
): UseFeatureFlagResult {
  const postHog = useOptionalPostHog();
  const [enabled, setEnabled] = useState<boolean>(defaultValue);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!postHog?.isInitialized) {
      setEnabled(defaultValue);
      setLoading(false);
      return;
    }

    // Check flag immediately
    const checkFlag = () => {
      const result = isFeatureEnabled(flagKey);
      setEnabled(result ?? defaultValue);
      setLoading(false);
    };

    checkFlag();

    // Listen for flag changes
    const handleFlagsLoaded = () => {
      checkFlag();
    };

    posthog.onFeatureFlags(handleFlagsLoaded);

    return () => {
      // PostHog doesn't have an off method, flags are checked on each render
    };
  }, [flagKey, defaultValue, postHog?.isInitialized]);

  return { enabled, loading };
}

interface UseFeatureFlagVariantResult<T = string | boolean> {
  variant: T | undefined;
  loading: boolean;
}

/**
 * Get the variant/value of a feature flag
 */
export function useFeatureFlagVariant<T = string | boolean>(
  flagKey: FeatureFlagKey
): UseFeatureFlagVariantResult<T> {
  const postHog = useOptionalPostHog();
  const [variant, setVariant] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!postHog?.isInitialized) {
      setLoading(false);
      return;
    }

    const checkVariant = () => {
      const result = getFeatureFlag(flagKey);
      setVariant(result as T | undefined);
      setLoading(false);
    };

    checkVariant();
    posthog.onFeatureFlags(checkVariant);
  }, [flagKey, postHog?.isInitialized]);

  return { variant, loading };
}

interface UseFeatureFlagPayloadResult<T = unknown> {
  payload: T | undefined;
  loading: boolean;
}

/**
 * Get the JSON payload of a feature flag
 */
export function useFeatureFlagPayload<T = unknown>(
  flagKey: FeatureFlagKey
): UseFeatureFlagPayloadResult<T> {
  const postHog = useOptionalPostHog();
  const [payload, setPayload] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!postHog?.isInitialized) {
      setLoading(false);
      return;
    }

    const checkPayload = () => {
      const result = getFeatureFlagPayload(flagKey);
      setPayload(result as T | undefined);
      setLoading(false);
    };

    checkPayload();
    posthog.onFeatureFlags(checkPayload);
  }, [flagKey, postHog?.isInitialized]);

  return { payload, loading };
}

/**
 * Hook for multiple feature flags at once
 */
export function useFeatureFlags(
  flagKeys: FeatureFlagKey[]
): Record<FeatureFlagKey, boolean> {
  const postHog = useOptionalPostHog();
  const [flags, setFlags] = useState<Record<FeatureFlagKey, boolean>>({});

  useEffect(() => {
    if (!postHog?.isInitialized) {
      const defaults: Record<FeatureFlagKey, boolean> = {};
      flagKeys.forEach(key => { defaults[key] = false; });
      setFlags(defaults);
      return;
    }

    const checkFlags = () => {
      const results: Record<FeatureFlagKey, boolean> = {};
      flagKeys.forEach(key => {
        results[key] = isFeatureEnabled(key) ?? false;
      });
      setFlags(results);
    };

    checkFlags();
    posthog.onFeatureFlags(checkFlags);
  }, [flagKeys.join(','), postHog?.isInitialized]);

  return flags;
}
