import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Shield, AlertTriangle, Mail } from 'lucide-react';
import { InlineLoader } from '@/components/ui/unified-loader';
import PhoneInput from 'react-phone-number-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '@/styles/phone-input.css';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';
import { useCountryDetection } from '@/hooks/useCountryDetection';
import type { PhoneVerificationProps } from '@/types/verification';
import { useTranslation } from 'react-i18next';

// Country prefixes with known SMS delivery issues
const LOW_DELIVERY_PREFIXES = ['+44', '+98', '+971', '+91', '+92', '+234', '+966'];

export const PhoneVerification = ({
  phoneNumber,
  phoneVerified,
  onPhoneChange,
  onVerificationComplete,
}: PhoneVerificationProps) => {
  const { t } = useTranslation('common');
  const [otpCode, setOtpCode] = useState('');
  const [smsError, setSmsError] = useState<{ message: string; suggestion?: string } | null>(null);

  // Detect if phone prefix has known delivery issues
  const hasDeliveryRisk = useMemo(() => {
    if (!phoneNumber) return false;
    return LOW_DELIVERY_PREFIXES.some(prefix => phoneNumber.startsWith(prefix));
  }, [phoneNumber]);
  const {
    otpSent,
    isVerifying,
    isSendingOtp,
    resendCooldown,
    sendOTP,
    verifyOTP,
    resetVerification,
  } = usePhoneVerification();

  const { countryCode } = useCountryDetection();

  const isPhoneValid = phoneNumber && isValidPhoneNumber(phoneNumber);

  const handleSendOTP = async () => {
    if (!isPhoneValid) return;
    setSmsError(null);
    const success = await sendOTP(phoneNumber);
    if (!success) {
      // The hook's toast will show, but we also check for specific SMS errors
      setSmsError({
        message: 'SMS could not be delivered.',
        suggestion: 'Try using email verification instead, or check your number is a mobile (not landline).',
      });
    }
  };

  const handleVerifyOTP = async () => {
    const success = await verifyOTP(phoneNumber, otpCode, () => {
      onVerificationComplete?.();
      setOtpCode('');
    });

    if (success) {
      onPhoneChange(phoneNumber);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setOtpCode('');
    setSmsError(null);
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
      setSmsError(null);
    }
  }, [phoneNumber]);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="phone">Phone Number</Label>
        <div className="flex gap-2">
          <PhoneInput
            international
            defaultCountry={countryCode as any}
            value={phoneNumber}
            onChange={onPhoneChange}
            disabled={phoneVerified || otpSent}
            className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {!phoneVerified && isPhoneValid && !otpSent && (
            <Button
              type="button"
              onClick={handleSendOTP}
              disabled={isSendingOtp}
              className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
            >
              {isSendingOtp ? (
                <InlineLoader text="Sending..." className="text-white" />
              ) : (
                'Verify'
              )}
            </Button>
          )}
          {phoneVerified && (
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
        {phoneNumber && !isPhoneValid && !otpSent && (
          <div className="flex items-center gap-2 text-xs text-destructive mt-2">
            <XCircle className="w-4 h-4" />
            <span>Invalid phone number</span>
          </div>
        )}
        {/* Country-prefix delivery warning */}
        {hasDeliveryRisk && !phoneVerified && !otpSent && isPhoneValid && (
          <div className="flex items-start gap-2 p-3 mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="text-amber-600 dark:text-amber-400 font-medium">SMS delivery to your region may be delayed or blocked.</p>
              <p className="text-muted-foreground mt-1">We recommend using <strong>email verification</strong>for faster, more reliable delivery.</p>
            </div>
          </div>
        )}
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

          {/* Delivery guidance */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Didn't receive the SMS? Delivery can take up to 2 minutes. 
              Some carriers may block verification messages — if it doesn't arrive, try <strong>email verification</strong> instead.
            </p>
          </div>

          {smsError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <p className="text-destructive font-medium">{smsError.message}</p>
                {smsError.suggestion && (
                  <p className="text-muted-foreground mt-1">{smsError.suggestion}</p>
                )}
              </div>
            </div>
          )}

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
