import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validatePhoneNumber, validateOTP } from '@/lib/validation';
import type { VerificationHookReturn } from '@/types/verification';

const COOLDOWN_STORAGE_KEY = 'phone_verification_cooldown';
const COOLDOWN_DURATION = 60; // seconds
const DEBOUNCE_MS = 1000; // minimum ms between send attempts
const MAX_RETRIES = 3; // max auto-retries for network errors
const RETRY_DELAY_MS = 2000; // delay between retries

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

  // Helper function to detect network errors
  const isNetworkError = (error: unknown): boolean => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('failed to fetch') || 
             message.includes('network') ||
             message.includes('failed to send a request') ||
             message.includes('typeerror');
    }
    return false;
  };

  // Internal send function with retry logic (matching email verification)
  const sendWithRetry = async (phoneNumber: string, retryCount = 0): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('send-sms-verification', {
        body: { phone: phoneNumber },
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });

      if (error) {
        // Check if it's a network error and we haven't exceeded retries
        if (isNetworkError(error) && retryCount < MAX_RETRIES) {
          console.log(`[PhoneVerification] Network error, retry ${retryCount + 1}/${MAX_RETRIES}`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          return sendWithRetry(phoneNumber, retryCount + 1);
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
        throw new Error(data.error);
      }

      setNetworkError(false);
      setOtpSent(true);
      toast.success('Verification code sent to your phone');
      return true;
    } catch (error: unknown) {
      // Check if we should retry
      if (isNetworkError(error) && retryCount < MAX_RETRIES) {
        console.log(`[PhoneVerification] Network error, retry ${retryCount + 1}/${MAX_RETRIES}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        return sendWithRetry(phoneNumber, retryCount + 1);
      }
      throw error;
    }
  };

  const sendOTP = useCallback(async (phoneNumber: string) => {
    // Debounce check - prevent rapid successive calls
    const now = Date.now();
    if (now - lastSendAttemptRef.current < DEBOUNCE_MS) {
      console.log('[PhoneVerification] Debounced - too soon since last attempt');
      return false;
    }
    
    // Don't allow if already sending or in cooldown (unless network error)
    if (isSendingOtp) {
      console.log('[PhoneVerification] Already sending OTP');
      return false;
    }
    
    if (resendCooldown > 0 && !networkError) {
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
    setNetworkError(false);
    
    // Start cooldown immediately to prevent rapid clicks
    startCooldownTimer(COOLDOWN_DURATION);

    try {
      return await sendWithRetry(phoneNumber);
    } catch (error: unknown) {
      console.error('[PhoneVerification] Error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Parse rate limit from error message
      const retryMatch = errorMessage.match(/wait (\d+) minute/i);
      if (retryMatch) {
        const minutes = parseInt(retryMatch[1], 10);
        startCooldownTimer(minutes * 60);
        toast.error(`Too many attempts. Please wait ${minutes} minute(s).`);
      } else if (isNetworkError(error)) {
        // Network error - allow immediate retry
        setNetworkError(true);
        toast.error('Connection failed. Please check your internet and try again.');
        setResendCooldown(0);
        localStorage.removeItem(COOLDOWN_STORAGE_KEY);
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current);
          cooldownIntervalRef.current = null;
        }
      } else {
        toast.error(errorMessage || 'Failed to send verification code');
        // Reset cooldown on non-rate-limit errors so user can retry
        setResendCooldown(0);
        localStorage.removeItem(COOLDOWN_STORAGE_KEY);
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current);
          cooldownIntervalRef.current = null;
        }
      }
      return false;
    } finally {
      setIsSendingOtp(false);
    }
  }, [isSendingOtp, resendCooldown, networkError, startCooldownTimer]);

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
      setResendCooldown(0);
      localStorage.removeItem(COOLDOWN_STORAGE_KEY);
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
      onSuccess?.();
      return true;
    } catch (error: unknown) {
      console.error('Error verifying phone:', error);
      toast.error(error instanceof Error ? error.message : 'Invalid or expired verification code');
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
    setNetworkError(false);
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
