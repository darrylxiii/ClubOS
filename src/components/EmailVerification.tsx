import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Mail, Shield, RefreshCw } from 'lucide-react';
import { InlineLoader } from '@/components/ui/unified-loader';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useEmailVerification } from '@/hooks/useEmailVerification';
import type { EmailVerificationProps } from '@/types/verification';

export const EmailVerification = ({
  email,
  emailVerified,
  onEmailChange,
  onVerificationComplete,
}: EmailVerificationProps) => {
  const [otpCode, setOtpCode] = useState('');
  const {
    otpSent,
    isVerifying,
    isSendingOtp,
    resendCooldown,
    networkError,
    sendOTP,
    verifyOTP,
    resetVerification,
  } = useEmailVerification();

  const isEmailValid = email && email.includes('@');

  const handleSendOTP = async () => {
    if (!isEmailValid) return;
    await sendOTP(email);
  };

  const handleVerifyOTP = useCallback(async () => {
    const success = await verifyOTP(email, otpCode, () => {
      onVerificationComplete?.();
      setOtpCode('');
    });
  }, [email, otpCode, verifyOTP, onVerificationComplete]);

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setOtpCode('');
    await sendOTP(email);
  };

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    if (otpCode.length === 6 && otpSent) {
      handleVerifyOTP();
    }
  }, [otpCode, otpSent, handleVerifyOTP]);

  // Reset OTP state when email changes
  useEffect(() => {
    if (otpSent) {
      resetVerification();
      setOtpCode('');
    }
  }, [email, otpSent, resetVerification]);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <div className="flex flex-col gap-3">
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={onEmailChange}
            disabled={emailVerified || otpSent}
            className="bg-background/50"
          />
          {!emailVerified && isEmailValid && !otpSent && (
            <div className="space-y-2">
              <Button
                type="button"
                onClick={handleSendOTP}
                disabled={isSendingOtp}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/20 transition-all duration-200"
              >
                {isSendingOtp ? (
                  <InlineLoader text="Sending code..." className="text-primary-foreground" />
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Verify Email Address
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                We'll send a 6-digit code to verify your email
              </p>
            </div>
          )}
          {emailVerified && (
            <Button
              type="button"
              disabled
              className="w-full sm:w-auto bg-emerald-600 dark:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Verified
            </Button>
          )}
        </div>
        {email && !isEmailValid && !otpSent && (
          <div className="flex items-center gap-2 text-xs text-destructive mt-2">
            <XCircle className="w-4 h-4" />
            <span>Invalid email address</span>
          </div>
        )}
      </div>

      {otpSent && !emailVerified && (
        <div className="p-4 border border-accent/20 rounded-lg bg-accent/5 space-y-4 max-w-full overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="email-otp" className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Enter 6-digit verification code
            </Label>
            <p className="text-xs text-muted-foreground break-all">
              We sent a code to {email}
            </p>
          </div>

          {networkError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
              <p className="text-sm text-destructive flex items-center gap-2">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                Connection failed. Please check your internet.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendOTP}
                disabled={isSendingOtp}
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSendingOtp ? 'animate-spin' : ''}`} />
                {isSendingOtp ? 'Retrying...' : 'Retry'}
              </Button>
            </div>
          )}

          <div className="flex justify-center overflow-x-auto py-1">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={setOtpCode}
              disabled={isVerifying}
            >
              <InputOTPGroup className="gap-1 sm:gap-2">
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResendOTP}
              disabled={resendCooldown > 0 && !networkError}
            >
              {resendCooldown > 0 && !networkError ? (
                `Resend in ${resendCooldown}s`
              ) : (
                'Resend Code'
              )}
            </Button>

            <Button
              type="button"
              onClick={handleVerifyOTP}
              disabled={otpCode.length !== 6 || isVerifying}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isVerifying ? (
                <InlineLoader text="Verifying..." />
              ) : (
                'Verify'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
