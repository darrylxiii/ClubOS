import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useEmailVerification = () => {
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const sendOTP = useCallback(async (email: string) => {
    if (!email) {
      toast.error('Please enter an email address');
      return false;
    }

    setIsSendingOtp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in first');
        return false;
      }

      const { data, error } = await supabase.functions.invoke('send-email-verification', {
        body: { email },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
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
    if (!token || token.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return false;
    }

    setIsVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in first');
        return false;
      }

      const { data, error } = await supabase.functions.invoke('verify-email-code', {
        body: { email, code: token },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
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
