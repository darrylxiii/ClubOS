import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Warn 2 minutes before
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * Monitors user activity and signs them out after 30 minutes of inactivity.
 * Shows a warning toast 2 minutes before timeout.
 */
export function useIdleSessionTimeout() {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningShownRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    warningShownRef.current = false;
  }, []);

  const resetTimer = useCallback(() => {
    if (!user) return;
    
    clearTimers();

    // Set warning timer
    warningRef.current = setTimeout(() => {
      if (!warningShownRef.current) {
        warningShownRef.current = true;
        toast.warning('Your session will expire in 2 minutes due to inactivity.', {
          duration: 10000,
          id: 'idle-warning',
        });
      }
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      toast.info('You have been signed out due to inactivity.', { duration: 6000 });
      signOut();
    }, IDLE_TIMEOUT_MS);
  }, [user, signOut, clearTimers]);

  useEffect(() => {
    if (!user) {
      clearTimers();
      return;
    }

    resetTimer();

    const handleActivity = () => {
      if (warningShownRef.current) {
        // User came back, dismiss warning
        toast.dismiss('idle-warning');
      }
      resetTimer();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [user, resetTimer, clearTimers]);
}
