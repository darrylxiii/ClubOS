import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LockoutStatus {
  locked: boolean;
  attempts: number;
  remainingSeconds?: number;
  unlockAt?: string;
  message?: string;
}

interface UseLoginLockoutReturn {
  checkLockout: (email: string) => Promise<LockoutStatus>;
  recordAttempt: (email: string, success: boolean) => Promise<void>;
  lockoutStatus: LockoutStatus | null;
  isChecking: boolean;
}

export function useLoginLockout(): UseLoginLockoutReturn {
  const [lockoutStatus, setLockoutStatus] = useState<LockoutStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkLockout = useCallback(async (email: string): Promise<LockoutStatus> => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-login-lockout', {
        body: { email, action: 'check' }
      });

      if (error) {
        console.error('[useLoginLockout] Check failed:', error);
        // Fail open - allow login attempt
        return { locked: false, attempts: 0 };
      }

      const status: LockoutStatus = {
        locked: data?.locked || false,
        attempts: data?.attempts || 0,
        remainingSeconds: data?.remaining_seconds,
        unlockAt: data?.unlock_at,
        message: data?.message
      };

      setLockoutStatus(status);
      return status;
    } catch (err) {
      console.error('[useLoginLockout] Error:', err);
      return { locked: false, attempts: 0 };
    } finally {
      setIsChecking(false);
    }
  }, []);

  const recordAttempt = useCallback(async (email: string, success: boolean): Promise<void> => {
    try {
      await supabase.functions.invoke('check-login-lockout', {
        body: { email, action: 'record', success }
      });
    } catch (err) {
      console.error('[useLoginLockout] Failed to record attempt:', err);
      // Don't throw - this shouldn't block the login flow
    }
  }, []);

  return {
    checkLockout,
    recordAttempt,
    lockoutStatus,
    isChecking
  };
}
