/**
 * Navigation Tracing Hook - No-op Implementation
 * Provides stub functions for compatibility without actual tracing.
 */

import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Navigation tracing hook - no-op implementation
 */
export function useNavigationTracing(): void {
  const location = useLocation();
  const navigationType = useNavigationType();
  
  useEffect(() => {
    // No-op - tracing disabled
  }, [location.pathname, location.search, location.hash, navigationType, location.key]);
}

/**
 * Hook to trace user interactions - no-op implementation
 */
export function useInteractionTracing(_componentName: string) {
  const traceInteraction = (
    _interactionType: string,
    _details?: Record<string, unknown>
  ) => {
    return {
      end: (_status?: 'success' | 'error', _error?: Error) => {
        // No-op
      },
    };
  };

  return { traceInteraction };
}
