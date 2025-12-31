/**
 * Feature Flag React Hook
 * Provides reactive feature flag access in components
 */

import { useState, useEffect, useCallback } from 'react';
import { featureFlags, type FeatureFlag, type FeatureFlagContext } from './index';

export function useFeatureFlag(key: string): boolean {
  const [enabled, setEnabled] = useState(() => featureFlags.isEnabled(key));

  useEffect(() => {
    // Re-check on mount
    setEnabled(featureFlags.isEnabled(key));

    // Listen for changes
    const unsubscribe = featureFlags.onChange((changedKey, newEnabled) => {
      if (changedKey === key) {
        setEnabled(newEnabled);
      }
    });

    return unsubscribe;
  }, [key]);

  return enabled;
}

export function useFeatureFlags(keys: string[]): Record<string, boolean> {
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    const result: Record<string, boolean> = {};
    keys.forEach((key) => {
      result[key] = featureFlags.isEnabled(key);
    });
    return result;
  });

  useEffect(() => {
    // Re-check on mount
    const result: Record<string, boolean> = {};
    keys.forEach((key) => {
      result[key] = featureFlags.isEnabled(key);
    });
    setFlags(result);

    // Listen for changes
    const unsubscribe = featureFlags.onChange((changedKey, newEnabled) => {
      if (keys.includes(changedKey)) {
        setFlags((prev) => ({ ...prev, [changedKey]: newEnabled }));
      }
    });

    return unsubscribe;
  }, [keys.join(',')]);

  return flags;
}

export function useFeatureFlagContext() {
  const setContext = useCallback((context: FeatureFlagContext) => {
    featureFlags.setContext(context);
  }, []);

  const updateContext = useCallback((updates: Partial<FeatureFlagContext>) => {
    featureFlags.updateContext(updates);
  }, []);

  return { setContext, updateContext };
}

export function useFeatureFlagAdmin() {
  const [flags, setFlags] = useState<FeatureFlag[]>(() => featureFlags.getAllFlags());
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() => 
    featureFlags.getOverrides()
  );

  const refresh = useCallback(() => {
    setFlags(featureFlags.getAllFlags());
    setOverrides(featureFlags.getOverrides());
  }, []);

  useEffect(() => {
    const unsubscribe = featureFlags.onChange(() => {
      refresh();
    });
    return unsubscribe;
  }, [refresh]);

  const setOverride = useCallback((key: string, enabled: boolean) => {
    featureFlags.setOverride(key, enabled);
    refresh();
  }, [refresh]);

  const clearOverride = useCallback((key: string) => {
    featureFlags.clearOverride(key);
    refresh();
  }, [refresh]);

  const clearAllOverrides = useCallback(() => {
    featureFlags.clearAllOverrides();
    refresh();
  }, [refresh]);

  return {
    flags,
    overrides,
    setOverride,
    clearOverride,
    clearAllOverrides,
    refresh,
  };
}
