/**
 * A/B Testing Experiment Component
 * Wrapper for PostHog experiments
 */

import { ReactNode, useEffect } from 'react';
import { useFeatureFlagVariant, FeatureFlagKey } from '@/hooks/useFeatureFlag';
import { trackEvent } from '@/lib/posthog';

interface ExperimentProps<T extends string = string> {
  /** The experiment/feature flag key */
  name: FeatureFlagKey;
  /** Map of variant names to content */
  variants: Record<T, ReactNode>;
  /** Default content if no variant matched (control) */
  control?: ReactNode;
  /** Track exposure automatically */
  trackExposure?: boolean;
  /** Custom exposure event name */
  exposureEventName?: string;
}

/**
 * A/B Test wrapper component
 * Automatically tracks exposure and renders the appropriate variant
 */
export function Experiment<T extends string = string>({
  name,
  variants,
  control = null,
  trackExposure = true,
  exposureEventName,
}: ExperimentProps<T>) {
  const { variant, loading } = useFeatureFlagVariant<T | 'control'>(name);

  // Track experiment exposure
  useEffect(() => {
    if (loading || !trackExposure) return;

    trackEvent(exposureEventName || '$experiment_started', {
      experiment_name: name,
      variant: variant || 'control',
      timestamp: new Date().toISOString(),
    });
  }, [name, variant, loading, trackExposure, exposureEventName]);

  if (loading) {
    // Return control while loading to avoid flash
    return <>{control}</>;
  }

  // If variant matches a key in variants, render it
  if (variant && variant !== 'control' && variant in variants) {
    return <>{variants[variant as T]}</>;
  }

  // Default to control
  return <>{control}</>;
}

interface ExperimentConversionProps {
  /** The experiment name */
  experimentName: string;
  /** Conversion event name */
  eventName?: string;
  /** Additional properties */
  properties?: Record<string, unknown>;
  /** Children wrapped by conversion tracking */
  children: ReactNode;
  /** Element to track (default: onClick) */
  trackOn?: 'click' | 'view' | 'submit';
}

/**
 * Track conversions within an experiment
 */
export function ExperimentConversion({
  experimentName,
  eventName = '$experiment_converted',
  properties = {},
  children,
  trackOn = 'click',
}: ExperimentConversionProps) {
  const handleConversion = () => {
    trackEvent(eventName, {
      experiment_name: experimentName,
      ...properties,
      timestamp: new Date().toISOString(),
    });
  };

  // For view tracking, fire on mount
  useEffect(() => {
    if (trackOn === 'view') {
      handleConversion();
    }
  }, [trackOn]);

  if (trackOn === 'view') {
    return <>{children}</>;
  }

  // Wrap children with event handler
  return (
    <div onClick={trackOn === 'click' ? handleConversion : undefined}>
      {children}
    </div>
  );
}

/**
 * Hook for manual experiment tracking
 */
export function useExperiment(experimentName: string) {
  const { variant, loading } = useFeatureFlagVariant<string>(experimentName);

  const trackConversion = (
    conversionName: string = 'converted',
    properties?: Record<string, unknown>
  ) => {
    trackEvent('$experiment_converted', {
      experiment_name: experimentName,
      conversion_name: conversionName,
      variant: variant || 'control',
      ...properties,
    });
  };

  return {
    variant: variant || 'control',
    loading,
    isControl: !variant || variant === 'control',
    trackConversion,
  };
}
