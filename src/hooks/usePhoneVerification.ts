import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validatePhoneNumber, validateOTP } from '@/lib/validation';
import type { VerificationHookReturn } from '@/types/verification';

const COOLDOWN_STORAGE_KEY = 'phone_verification_cooldown';
const COOLDOWN_DURATION = 60; // seconds
const DEBOUNCE_MS = 1000; // minimum ms between send attempts

export const usePhoneVerification = (): VerificationHookReturn => {
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [networkError, setNetworkError] = useState(false);
  
  // Debounce refs
  const lastSendAttemptRef = useRef<number>(0);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Restore cooldown from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (stored) {
      try {
        const { expiresAt } = JSON.parse(stored);
        const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
        if (remaining > 0) {
          setResendCooldown(remaining);
          setOtpSent(true);
          startCooldownTimer(remaining);
        } else {
          localStorage.removeItem(COOLDOWN_STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(COOLDOWN_STORAGE_KEY);
      }
    }
    
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  const startCooldownTimer = useCallback((duration: number) => {
    // Clear any existing interval
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
    }
    
    setResendCooldown(duration);
    
    // Store expiry time in localStorage
    localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify({
      expiresAt: Date.now() + (duration * 1000)
    }));
    
    cooldownIntervalRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownIntervalRef.current) {
            clearInterval(cooldownIntervalRef.current);
            cooldownIntervalRef.current = null;
          }
          localStorage.removeItem(COOLDOWN_STORAGE_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const sendOTP = useCallback(async (phoneNumber: string) => {
    // Debounce check - prevent rapid successive calls
    const now = Date.now();
    if (now - lastSendAttemptRef.current < DEBOUNCE_MS) {
      console.log('[PhoneVerification] Debounced - too soon since last attempt');
      return false;
    }
    
    // Don't allow if already sending or in cooldown
    if (isSendingOtp) {
      console.log('[PhoneVerification] Already sending OTP');
      return false;
    }
    
    if (resendCooldown > 0) {
      toast.error(`Please wait ${resendCooldown} seconds before requesting another code`);
      return false;
    }

    const phoneValidation = validatePhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.error);
      return false;
    }

    lastSendAttemptRef.current = now;
    setIsSendingOtp(true);
    
    // Start cooldown immediately to prevent rapid clicks
    startCooldownTimer(COOLDOWN_DURATION);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('send-sms-verification', {
        body: { phone: phoneNumber },
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });

      if (error) {
        console.error('[Phone Verification] Edge function error:', error);
        // Reset cooldown on error so user can retry
        setResendCooldown(0);
        localStorage.removeItem(COOLDOWN_STORAGE_KEY);
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current);
          cooldownIntervalRef.current = null;
        }
        throw error;
      }

      // Handle rate limit error with retry info
      if (data?.error) {
        if (data.retry_after_seconds || data.retry_after_minutes) {
          const retrySeconds = data.retry_after_seconds || Math.ceil(data.retry_after_minutes * 60);
          startCooldownTimer(retrySeconds);
          toast.error(`Too many attempts. Please wait ${Math.ceil(retrySeconds / 60)} minute(s).`);
          return false;
        }
        // Reset cooldown on other errors
        setResendCooldown(0);
        localStorage.removeItem(COOLDOWN_STORAGE_KEY);
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current);
          cooldownIntervalRef.current = null;
        }
        throw new Error(data.error);
      }

      setOtpSent(true);
      toast.success('Verification code sent to your phone');
      return true;
    } catch (error: any) {
      console.error('[Phone Verification] Error:', error);
      
      // Parse rate limit from error message
      const retryMatch = error.message?.match(/wait (\d+) minute/i);
      if (retryMatch) {
        const minutes = parseInt(retryMatch[1], 10);
        startCooldownTimer(minutes * 60);
        toast.error(`Too many attempts. Please wait ${minutes} minute(s).`);
      } else {
        toast.error(error.message || 'Failed to send verification code');
      }
      return false;
    } finally {
      setIsSendingOtp(false);
    }
  }, [isSendingOtp, resendCooldown, startCooldownTimer]);

  const verifyOTP = useCallback(async (
    phoneNumber: string,
    token: string,
    onSuccess?: () => void
  ) => {
    const otpValidation = validateOTP(token, 6);
    if (!otpValidation.isValid) {
      toast.error(otpValidation.error);
      return false;
    }

    const phoneValidation = validatePhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.error);
      return false;
    }

    setIsVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('verify-sms-code', {
        body: { phone: phoneNumber, code: token },
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Phone number verified successfully! 🎉');
      setOtpSent(false);
      onSuccess?.();
      return true;
    } catch (error: any) {
      console.error('Error verifying phone:', error);
      toast.error(error.message || 'Invalid or expired verification code');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const resetVerification = useCallback(() => {
    setOtpSent(false);
    setIsVerifying(false);
    setIsSendingOtp(false);
    setResendCooldown(0);
    localStorage.removeItem(COOLDOWN_STORAGE_KEY);
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
  }, []);

  return {
    otpSent,
    isVerifying,
    isSendingOtp,
    resendCooldown,
    networkError,
    sendOTP,
    verifyOTP,
    resetVerification,
  };
};
