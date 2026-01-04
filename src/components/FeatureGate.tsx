/**
 * Feature Gate Component
 * Conditionally render content based on feature flags
 */

import { ReactNode } from 'react';
import { useFeatureFlag, useFeatureFlagVariant, FeatureFlagKey } from '@/hooks/useFeatureFlag';

interface FeatureGateProps {
  /** The feature flag key to check */
  flag: FeatureFlagKey;
  /** Content to render when flag is enabled */
  children: ReactNode;
  /** Optional fallback content when flag is disabled */
  fallback?: ReactNode;
  /** Show loading state while checking flag */
  showLoading?: boolean;
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Invert the condition (show when disabled) */
  invert?: boolean;
}

/**
 * Conditionally render content based on a feature flag
 */
export function FeatureGate({
  flag,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent = null,
  invert = false,
}: FeatureGateProps) {
  const { enabled, loading } = useFeatureFlag(flag);

  if (loading && showLoading) {
    return <>{loadingComponent}</>;
  }

  const shouldShow = invert ? !enabled : enabled;

  return <>{shouldShow ? children : fallback}</>;
}

interface FeatureVariantGateProps<T extends string> {
  /** The feature flag key to check */
  flag: FeatureFlagKey;
  /** Map of variant values to content */
  variants: Record<T, ReactNode>;
  /** Default content if variant doesn't match */
  defaultContent?: ReactNode;
  /** Show loading state while checking flag */
  showLoading?: boolean;
  /** Custom loading component */
  loadingComponent?: ReactNode;
}

/**
 * Render different content based on feature flag variant
 */
export function FeatureVariantGate<T extends string>({
  flag,
  variants,
  defaultContent = null,
  showLoading = false,
  loadingComponent = null,
}: FeatureVariantGateProps<T>) {
  const { variant, loading } = useFeatureFlagVariant<T>(flag);

  if (loading && showLoading) {
    return <>{loadingComponent}</>;
  }

  if (variant && variant in variants) {
    return <>{variants[variant]}</>;
  }

  return <>{defaultContent}</>;
}

// Export types
export type { FeatureFlagKey };
