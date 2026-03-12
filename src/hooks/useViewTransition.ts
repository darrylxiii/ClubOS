import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

export const supportsViewTransitions = typeof document !== 'undefined' && 'startViewTransition' in document;

/**
 * Hook that wraps react-router navigate with the View Transitions API.
 * Falls back to plain navigation when unsupported.
 */
export function useViewTransition() {
  const navigate = useNavigate();

  const navigateWithTransition = useCallback(
    (to: string, options?: { replace?: boolean }) => {
      if (supportsViewTransitions) {
        (document as any).startViewTransition(() => {
          navigate(to, options);
        });
      } else {
        navigate(to, options);
      }
    },
    [navigate]
  );

  return { navigateWithTransition, supportsViewTransitions };
}
