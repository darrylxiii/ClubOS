import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { ShieldCheck, Smartphone, CheckCircle2, Copy } from "lucide-react";
import { PageLoader } from "@/components/PageLoader";

type MfaStep = 'intro' | 'enroll' | 'verify' | 'complete';

export default function MfaSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<MfaStep>('intro');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Check if already enrolled
  useEffect(() => {
    const checkExisting = async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.filter(f => f.status === 'verified') || [];
      if (verified.length > 0) {
        navigate('/dashboard', { replace: true });
      }
    };
    checkExisting();
  }, [navigate]);

  const handleEnroll = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'The Quantum Club TOTP',
      });

      if (error) {
        toast.error('Failed to set up MFA. Please try again.');
        console.error('[MfaSetup] Enroll error:', error);
        return;
      }

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStep('verify');
    } catch (err) {
      console.error('[MfaSetup] Error:', err);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) return;

    setIsVerifying(true);
    try {
      const challengeResult = await supabase.auth.mfa.challenge({ factorId });
      if (challengeResult.error) {
        toast.error('Challenge failed. Please try again.');
        return;
      }

      const verifyResult = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeResult.data.id,
        code: verifyCode,
      });

      if (verifyResult.error) {
        toast.error('Invalid code. Please check your authenticator app and try again.');
        setVerifyCode('');
        return;
      }

      setStep('complete');
      toast.success('MFA enabled successfully');
    } catch (err) {
      console.error('[MfaSetup] Verify error:', err);
      toast.error('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-submit on 6 digits
  useEffect(() => {
    if (verifyCode.length === 6 && !isVerifying) {
      handleVerify();
    }
  }, [verifyCode]);

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret copied to clipboard');
  };

  if (!user) return <PageLoader />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background/95 p-4">
      <Card className="w-full max-w-md backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl">
        {step === 'intro' && (
          <>
            <CardHeader className="space-y-4 text-center pt-8">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Set Up Two-Factor Authentication</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  Your role requires two-factor authentication for added security.
                  You'll need an authenticator app like Google Authenticator or 1Password.
                </p>
              </div>
            </CardHeader>
            <CardContent className="pb-8 space-y-4">
              <RainbowButton onClick={() => { setStep('enroll'); handleEnroll(); }} className="w-full" disabled={isLoading}>
                {isLoading ? 'Setting up...' : 'Continue Setup'}
              </RainbowButton>
            </CardContent>
          </>
        )}

        {step === 'enroll' && (
          <CardContent className="py-8 text-center">
            <PageLoader />
          </CardContent>
        )}

        {step === 'verify' && (
          <>
            <CardHeader className="space-y-4 text-center pt-8">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Scan QR Code</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  Scan this QR code with your authenticator app, then enter the 6-digit code.
                </p>
              </div>
            </CardHeader>
            <CardContent className="pb-8 space-y-6">
              {qrCode && (
                <div className="flex justify-center">
                  <img src={qrCode} alt="MFA QR Code" className="w-48 h-48 rounded-lg border border-border" />
                </div>
              )}

              <div className="flex items-center justify-center gap-2">
                <code className="text-xs bg-muted px-3 py-1.5 rounded font-mono tracking-wider">
                  {secret}
                </code>
                <Button variant="ghost" size="icon" onClick={copySecret} className="h-8 w-8">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex justify-center">
                <InputOTP value={verifyCode} onChange={setVerifyCode} maxLength={6} disabled={isVerifying}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <RainbowButton onClick={handleVerify} disabled={verifyCode.length !== 6 || isVerifying} className="w-full">
                {isVerifying ? 'Verifying...' : 'Verify & Enable'}
              </RainbowButton>
            </CardContent>
          </>
        )}

        {step === 'complete' && (
          <>
            <CardHeader className="space-y-4 text-center pt-8">
              <div className="w-16 h-16 mx-auto bg-success/20 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">MFA Enabled</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  Two-factor authentication is now active on your account.
                </p>
              </div>
            </CardHeader>
            <CardContent className="pb-8">
              <RainbowButton onClick={() => navigate('/dashboard', { replace: true })} className="w-full">
                Continue to Dashboard
              </RainbowButton>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
