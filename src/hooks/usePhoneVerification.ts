import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePhoneVerification = () => {
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const sendOTP = useCallback(async (phoneNumber: string) => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return false;
    }

    setIsSendingOtp(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      if (error) throw error;

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
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || 'Failed to send verification code');
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
    if (!token || token.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return false;
    }

    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: token,
        type: 'sms',
      });

      if (error) throw error;

      // Update phone_verified in profiles table
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            phone: phoneNumber,
            phone_verified: true 
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
      }

      toast.success('Phone number verified successfully!');
      setOtpSent(false);
      onSuccess?.();
      return true;
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || 'Invalid verification code');
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
