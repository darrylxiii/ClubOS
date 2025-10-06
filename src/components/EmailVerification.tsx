import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useEmailVerification } from '@/hooks/useEmailVerification';

interface EmailVerificationProps {
  email: string;
  emailVerified: boolean;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVerificationComplete?: () => void;
}

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
    sendOTP,
    verifyOTP,
    resetVerification,
  } = useEmailVerification();

  const isEmailValid = email && email.includes('@');

  const handleSendOTP = async () => {
    if (!isEmailValid) return;
    await sendOTP(email);
  };

  const handleVerifyOTP = async () => {
    const success = await verifyOTP(email, otpCode, () => {
      onVerificationComplete?.();
      setOtpCode('');
    });
  };

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
  }, [otpCode]);

  // Reset OTP state when email changes
  useEffect(() => {
    if (otpSent) {
      resetVerification();
      setOtpCode('');
    }
  }, [email]);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <div className="flex gap-2">
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
            <Button
              type="button"
              onClick={handleSendOTP}
              disabled={isSendingOtp}
              className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
            >
              {isSendingOtp ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Verify'
              )}
            </Button>
          )}
          {emailVerified && (
            <Button
              type="button"
              disabled
              className="bg-green-600 text-white whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
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
        <div className="p-4 border border-accent/20 rounded-lg bg-accent/5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-otp" className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Enter 6-digit verification code
            </Label>
            <p className="text-xs text-muted-foreground">
              We sent a code to {email}
            </p>
          </div>

          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={setOtpCode}
              disabled={isVerifying}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResendOTP}
              disabled={resendCooldown > 0}
            >
              {resendCooldown > 0 ? (
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
              className="bg-accent text-background hover:bg-accent/90"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
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
