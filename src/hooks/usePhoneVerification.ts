import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validatePhoneNumber, validateOTP } from '@/lib/validation';
import type { VerificationHookReturn } from '@/types/verification';

export const usePhoneVerification = (): VerificationHookReturn => {
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const sendOTP = useCallback(async (phoneNumber: string) => {
    const phoneValidation = validatePhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.error);
      return false;
    }

    setIsSendingOtp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('send-sms-verification', {
        body: { phone: phoneNumber },
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });

      // Phase 2: Better error handling with specific messages
      if (error) {
        console.error('[Phone Verification] Edge function error:', error);
        
        // Check if it's a rate limit error
        if (error.message?.includes('rate limit') || error.message?.includes('Too many')) {
          const retryMatch = error.message.match(/(\d+)\s*minutes?/);
          const minutes = retryMatch ? retryMatch[1] : 'a few';
          toast.error(`Too many attempts. Please wait ${minutes} minutes before trying again.`, {
            duration: 5000
          });
        } else {
          toast.error('Unable to send verification code. Please try again.');
        }
        return false;
      }

      // Phase 2: Parse backend error responses
      if (data?.error) {
        console.error('[Phone Verification] Backend error:', data);
        
        // Handle rate limiting with countdown
        if (data.error.includes('rate limit') || data.error.includes('Too many')) {
          const retryMatch = data.error.match(/(\d+)\s*minutes?/);
          const minutes = retryMatch ? retryMatch[1] : 'a few';
          toast.error(`Too many verification attempts. Please wait ${minutes} minutes before trying again.`, {
            duration: 5000
          });
        } else {
          toast.error(data.error);
        }
        return false;
      }

      // Phase 3: Only set OTP sent after successful backend confirmation
      if (data?.success) {
        setOtpSent(true);
        toast.success('Verification code sent to your phone');
        
        // Start 60-second cooldown
        setResendCooldown(60);
        const interval = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return true;
      } else {
        console.error('[Phone Verification] Unexpected response format:', data);
        toast.error('Unable to send verification code. Please try again.');
        return false;
      }
    } catch (error: any) {
      console.error('[Phone Verification] Unexpected error:', error);
      
      // Phase 2: Better error message parsing
      if (error.message?.includes('rate limit') || error.message?.includes('Too many')) {
        const retryMatch = error.message.match(/(\d+)\s*minutes?/);
        const minutes = retryMatch ? retryMatch[1] : 'a few';
        toast.error(`Too many attempts. Please wait ${minutes} minutes before trying again.`, {
          duration: 5000
        });
      } else {
        toast.error(error.message || 'Failed to send verification code');
      }
      return false;
    } finally {
      setIsSendingOtp(false);
    }
  }, []);

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
  }, []);

  return {
    otpSent,
    isVerifying,
    isSendingOtp,
    resendCooldown,
    sendOTP,
    verifyOTP,
    resetVerification,
  };
};
