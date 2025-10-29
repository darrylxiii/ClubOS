import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateEmail, validateOTP } from '@/lib/validation';
import type { VerificationHookReturn } from '@/types/verification';

export const useEmailVerification = (): VerificationHookReturn => {
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const sendOTP = useCallback(async (email: string) => {
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      toast.error(emailValidation.error);
      return false;
    }

    setIsSendingOtp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('send-email-verification', {
        body: { email },
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setOtpSent(true);
      toast.success('Verification code sent to your email');
      
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
    } catch (error: any) {
      console.error('Error sending email OTP:', error);
      toast.error(error.message || 'Failed to send verification code');
      return false;
    } finally {
      setIsSendingOtp(false);
    }
  }, []);

  const verifyOTP = useCallback(async (
    email: string,
    token: string,
    onSuccess?: () => void
  ) => {
    const otpValidation = validateOTP(token, 6);
    if (!otpValidation.isValid) {
      toast.error(otpValidation.error);
      return false;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      toast.error(emailValidation.error);
      return false;
    }

    setIsVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('verify-email-code', {
        body: { email, code: token },
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Email verified successfully! 🎉');
      setOtpSent(false);
      onSuccess?.();
      return true;
    } catch (error: any) {
      console.error('Error verifying email:', error);
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
