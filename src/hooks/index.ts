/**
 * Barrel exports for commonly used hooks
 * Import from '@/hooks' for cleaner imports
 */

// Core utility hooks
export { useDebounce } from './use-debounce';
export { useDebouncedCallback } from './useDebouncedCallback';
export { useIsMobile } from './use-mobile';
export { useOutsideClick } from './useOutsideClick';
export { useInView } from './useInView';
export { useLazyLoad } from './useLazyLoad';

// Notifications - prefer notify from @/lib/notify for new code
export { notify } from '@/lib/notify';

// Authentication & Role
export { useRole } from '@/contexts/RoleContext';
export type { UserRole } from '@/types/roles';

// State Management
export { useTableState } from './useTableState';
export { usePersistedFilters } from './usePersistedFilters';

// Analytics & Tracking
export { useHiringMetrics, useRecruiterPerformance, usePipelineHealth } from './useAnalytics';
export { useActivityTracking } from './useActivityTracking';

// Platform
export { usePlatform } from './usePlatform';
export { useNativeApp } from './useNativeApp';
export { usePWAUpdate } from './usePWAUpdate';
export { useInstallPrompt } from './useInstallPrompt';
export { useHaptics } from './useHaptics';

// Feature Flags (PostHog)
export { 
  useFeatureFlag, 
  useFeatureFlagVariant, 
  useFeatureFlagPayload,
  useFeatureFlags,
} from './useFeatureFlag';
export type { FeatureFlagKey } from './useFeatureFlag';

// Legacy Feature Flags (deprecated)
export { useFeatureFlags as useLegacyFeatureFlags } from './useFeatureFlags';

// Notifications
export { useNotifications } from './useNotifications';
export { usePushNotifications } from './usePushNotifications';

// Command Palette
export { useCommandPalette } from './useCommandPalette';

// Keyboard
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
