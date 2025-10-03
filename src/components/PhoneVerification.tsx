import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Loader2, Shield } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '@/styles/phone-input.css';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';

interface PhoneVerificationProps {
  phoneNumber: string;
  phoneVerified: boolean;
  onPhoneChange: (value: string | undefined) => void;
  onVerificationComplete?: () => void;
}

export const PhoneVerification = ({
  phoneNumber,
  phoneVerified,
  onPhoneChange,
  onVerificationComplete,
}: PhoneVerificationProps) => {
  const [otpCode, setOtpCode] = useState('');
  const {
    otpSent,
    isVerifying,
    isSendingOtp,
    resendCooldown,
    sendOTP,
    verifyOTP,
    resetVerification,
  } = usePhoneVerification();

  const isPhoneValid = phoneNumber && isValidPhoneNumber(phoneNumber);

  const handleSendOTP = async () => {
    if (!isPhoneValid) {
      return;
    }
    await sendOTP(phoneNumber);
  };

  const handleVerifyOTP = async () => {
    const success = await verifyOTP(phoneNumber, otpCode, () => {
      onVerificationComplete?.();
      setOtpCode('');
    });
    
    if (success) {
      // Trigger parent save by updating phone as verified
      onPhoneChange(phoneNumber);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setOtpCode('');
    await sendOTP(phoneNumber);
  };

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    if (otpCode.length === 6 && otpSent) {
      handleVerifyOTP();
    }
  }, [otpCode]);

  // Reset OTP state when phone number changes
  useEffect(() => {
    if (otpSent) {
      resetVerification();
      setOtpCode('');
    }
  }, [phoneNumber]);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="phone">Phone Number</Label>
        <div className="relative space-y-2">
          <div className="flex gap-2 items-center p-3 rounded-lg border border-input bg-background/50">
            <div className="flex-1">
              <PhoneInput
                international
                defaultCountry="US"
                value={phoneNumber}
                onChange={onPhoneChange}
                disabled={phoneVerified || otpSent}
                className="bg-transparent border-none focus:outline-none"
              />
            </div>
            
            {phoneNumber && isPhoneValid && !otpSent && (
              <Button
                type="button"
                size="sm"
                onClick={handleSendOTP}
                disabled={isSendingOtp}
                className={phoneVerified 
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
                }
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : phoneVerified ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Verified
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
            )}
          </div>
          
          {phoneNumber && !isPhoneValid && !otpSent && (
            <div className="flex items-center gap-2 text-xs text-destructive px-3">
              <XCircle className="w-4 h-4" />
              <span>Invalid phone number</span>
            </div>
          )}
        </div>
      </div>

      {otpSent && !phoneVerified && (
        <div className="p-4 border border-accent/20 rounded-lg bg-accent/5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-sm font-medium">
              Enter 6-digit verification code
            </Label>
            <p className="text-xs text-muted-foreground">
              We sent a code to {phoneNumber}
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
