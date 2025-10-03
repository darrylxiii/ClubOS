import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useEmailVerification = () => {
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [storedCode, setStoredCode] = useState('');

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendOTP = useCallback(async (email: string) => {
    if (!email) {
      toast.error('Please enter an email address');
      return false;
    }

    setIsSendingOtp(true);
    try {
      const code = generateCode();
      setStoredCode(code);

      const { error } = await supabase.functions.invoke('send-verification-code', {
        body: { email, code }
      });

      if (error) throw error;

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
    token: string,
    onSuccess?: () => void
  ) => {
    if (!token || token.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return false;
    }

    if (token !== storedCode) {
      toast.error('Invalid verification code');
      return false;
    }

    setIsVerifying(true);
    try {
      toast.success('Email verified successfully!');
      setOtpSent(false);
      setStoredCode('');
      onSuccess?.();
      return true;
    } catch (error: any) {
      console.error('Error verifying email OTP:', error);
      toast.error('Verification failed');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [storedCode]);

  const resetVerification = useCallback(() => {
    setOtpSent(false);
    setIsVerifying(false);
    setIsSendingOtp(false);
    setResendCooldown(0);
    setStoredCode('');
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
