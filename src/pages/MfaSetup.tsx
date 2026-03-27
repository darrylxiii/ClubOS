import { useState, useEffect, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { ShieldCheck, Smartphone, CheckCircle2, Copy, KeyRound, LogOut } from "lucide-react";
import { PageLoader } from "@/components/PageLoader";
import { logger } from "@/lib/logger";

type MfaStep = 'intro' | 'elevate' | 'verify' | 'complete';

export default function MfaSetup() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<MfaStep>('intro');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [elevateFactorId, setElevateFactorId] = useState<string>('');
  const [elevateChallengeId, setElevateChallengeId] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState('');
  const [elevateCode, setElevateCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isElevating, setIsElevating] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Check AAL level and existing factors on mount
  useEffect(() => {
    if (!user) return;

    const checkExisting = async () => {
      try {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verified = factorsData?.totp?.filter(f => f.status === 'verified') || [];

        // Session is AAL1 but a verified factor exists → need to elevate to prove identity, then redirect home
        if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2' && verified.length > 0) {
          const existingFactor = verified[0];
          setElevateFactorId(existingFactor.id);

          const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
            factorId: existingFactor.id,
          });

          if (challengeError) {
            logger.error('[MfaSetup] Challenge error during elevation setup:', challengeError);
            toast.error(t('text.mfasetup.couldNotInitiateVerificationPleaseSign', 'Could not initiate verification. Please sign in again.'));
            navigate('/auth', { replace: true });
            return;
          }

          setElevateChallengeId(challengeData.id);
          setStep('elevate');
          setInitialCheckDone(true);
          return;
        }

        // Already at AAL2 with verified factors → MFA is already set up, go home
        if (aalData?.currentLevel === 'aal2' && verified.length > 0) {
          await queryClient.invalidateQueries({ queryKey: ['auth-prefetch'] });
          navigate('/home', { replace: true });
          return;
        }

        // Clean up stale unverified factors from previous failed attempts
        const unverified = factorsData?.totp?.filter(f => f.status === 'unverified') || [];
        for (const f of unverified) {
          try {
            await supabase.auth.mfa.unenroll({ factorId: f.id });
          } catch {
            // Ignore unenroll errors for stale factors
          }
        }
      } catch (err) {
        logger.error('[MfaSetup] Error checking existing factors:', err);
      } finally {
        setInitialCheckDone(true);
      }
    };

    checkExisting();
  }, [user, navigate, queryClient]);

  // Elevate session from AAL1 → AAL2 by verifying existing TOTP factor
  // After elevation, redirect to /home (user already has MFA set up)
  const handleElevate = useCallback(async () => {
    if (elevateCode.length !== 6 || isElevating) return;

    setIsElevating(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: elevateFactorId,
        challengeId: elevateChallengeId,
        code: elevateCode,
      });

      if (error) {
        toast.error(t('text.mfasetup.invalidCodePleaseCheckYourAuthenticator', 'Invalid code. Please check your authenticator app.'));
        setElevateCode('');
        setIsElevating(false);
        // Re-create challenge for retry
        const { data: newChallenge } = await supabase.auth.mfa.challenge({
          factorId: elevateFactorId,
        });
        if (newChallenge) setElevateChallengeId(newChallenge.id);
        return;
      }

      // Session is now AAL2 — user already has MFA, redirect to home
      toast.success(t('text.mfasetup.identityVerified', 'Identity verified.'));
      await queryClient.invalidateQueries({ queryKey: ['auth-prefetch'] });
      navigate('/home', { replace: true });
    } catch (err) {
      logger.error('[MfaSetup] Elevation error:', err);
      toast.error(t('text.mfasetup.verificationFailedPleaseTryAgain', 'Verification failed. Please try again.'));
    } finally {
      setIsElevating(false);
    }
  }, [elevateCode, isElevating, elevateFactorId, elevateChallengeId, queryClient, navigate]);

  // Auto-submit elevate code on 6 digits
  useEffect(() => {
    if (elevateCode.length === 6 && !isElevating && step === 'elevate') {
      handleElevate();
    }
  }, [elevateCode, isElevating, step, handleElevate]);

  const handleEnroll = async () => {
    setIsLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error(t('text.mfasetup.sessionExpiredPleaseSignInAgain', 'Session expired. Please sign in again.'));
        navigate('/auth', { replace: true });
        return;
      }

      // Clean up any stale unverified factors before enrolling
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const stale = factors?.totp?.filter(f => f.status === 'unverified') || [];
      for (const f of stale) {
        try {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        } catch {
          // Ignore
        }
      }

      // Check if user already has a verified factor (edge case: factor was set up elsewhere)
      const verified = factors?.totp?.filter(f => f.status === 'verified') || [];
      if (verified.length > 0) {
        toast.success(t('text.mfasetup.mfaIsAlreadyEnabledOnYour', 'MFA is already enabled on your account.'));
        await queryClient.invalidateQueries({ queryKey: ['auth-prefetch'] });
        navigate('/home', { replace: true });
        return;
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'The Quantum Club TOTP',
      });

      if (error) {
        // Handle insufficient_aal gracefully — user already has a verified factor
        const errorMsg = error.message?.toLowerCase() || '';
        if (errorMsg.includes('aal2') || errorMsg.includes('insufficient_aal')) {
          // Already has MFA — just redirect home
          toast.success(t('text.mfasetup.mfaIsAlreadyEnabledOnYour', 'MFA is already enabled on your account.'));
          await queryClient.invalidateQueries({ queryKey: ['auth-prefetch'] });
          navigate('/home', { replace: true });
          return;
        }

        toast.error(t('text.mfasetup.failedToSetUpMfaPlease', 'Failed to set up MFA. Please try again.'));
        logger.error('[MfaSetup] Enroll error:', error);
        setStep('intro');
        return;
      }

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStep('verify');
    } catch (err) {
      logger.error('[MfaSetup] Error:', err);
      toast.error(t('text.mfasetup.somethingWentWrongPleaseTryAgain', 'Something went wrong. Please try again.'));
      setStep('intro');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = useCallback(async () => {
    if (verifyCode.length !== 6 || isVerifying) return;

    setIsVerifying(true);
    try {
      const challengeResult = await supabase.auth.mfa.challenge({ factorId });
      if (challengeResult.error) {
        toast.error(t('text.mfasetup.challengeFailedPleaseTryAgain', 'Challenge failed. Please try again.'));
        return;
      }

      const verifyResult = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeResult.data.id,
        code: verifyCode,
      });

      if (verifyResult.error) {
        toast.error(t('text.mfasetup.invalidCodePleaseCheckYourAuthenticator1', 'Invalid code. Please check your authenticator app and try again.'));
        setVerifyCode('');
        return;
      }

      // Invalidate cache so ProtectedRoute sees the new verified factor
      await queryClient.invalidateQueries({ queryKey: ['auth-prefetch'] });
      setStep('complete');
      toast.success(t('text.mfasetup.mfaEnabledSuccessfully', 'MFA enabled successfully'));
    } catch (err) {
      logger.error('[MfaSetup] Verify error:', err);
      toast.error(t('text.mfasetup.verificationFailed', 'Verification failed'));
    } finally {
      setIsVerifying(false);
    }
  }, [verifyCode, isVerifying, factorId, queryClient]);

  // Auto-submit verify code on 6 digits
  useEffect(() => {
    if (verifyCode.length === 6 && !isVerifying && step === 'verify') {
      handleVerify();
    }
  }, [verifyCode, isVerifying, step, handleVerify]);

  // Auto-redirect to /home after reaching 'complete' step
  useEffect(() => {
    if (step === 'complete') {
      const timer = setTimeout(() => {
        navigate('/home', { replace: true });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, navigate]);

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success(t('text.mfasetup.secretCopiedToClipboard', 'Secret copied to clipboard'));
  };

  const handleLostAccess = async () => {
    await supabase.auth.signOut();
    toast.info("Please contact your administrator to reset your MFA.", {
      duration: 8000,
      description: t('text.mfasetup.anAdminCanRemoveYourExisting', 'An admin can remove your existing authenticator so you can set up a new one.'),
    });
    navigate('/auth', { replace: true });
  };

  if (!user || !initialCheckDone) return <PageLoader />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background/95 p-4">
      <Card className="w-full max-w-md backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl">
        {step === 'elevate' && (
          <>
            <CardHeader className="space-y-4 text-center pt-8">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
                <KeyRound className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t('mfaSetup.text4')}</h1>
                <p className="text-muted-foreground mt-2 text-sm">{t('mfaSetup.desc')}</p>
              </div>
            </CardHeader>
            <CardContent className="pb-8 space-y-6">
              <div className="flex justify-center">
                <InputOTP value={elevateCode} onChange={setElevateCode} maxLength={6} disabled={isElevating}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <RainbowButton onClick={handleElevate} disabled={elevateCode.length !== 6 || isElevating} className="w-full">
                {isElevating ? t('text.mfasetup.verifying', 'Verifying...') : t('text.mfasetup.verifyContinue', 'Verify & Continue')}
              </RainbowButton>

              <div className="text-center pt-2 border-t border-border/30">
                <button
                  onClick={handleLostAccess}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Lost access to your authenticator?
                </button>
              </div>
            </CardContent>
          </>
        )}

        {step === 'intro' && (
          <>
            <CardHeader className="space-y-4 text-center pt-8">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t('mfaSetup.text5')}</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  Your role requires two-factor authentication for added security.
                  You'll need an authenticator app like Google Authenticator or 1Password.
                </p>
              </div>
            </CardHeader>
            <CardContent className="pb-8 space-y-4">
              <RainbowButton onClick={handleEnroll} className="w-full" disabled={isLoading}>
                {isLoading ? t('text.mfasetup.settingUp', 'Setting up...') : t('text.mfasetup.continueSetup', 'Continue Setup')}
              </RainbowButton>
            </CardContent>
          </>
        )}

        {step === 'verify' && (
          <>
            <CardHeader className="space-y-4 text-center pt-8">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t('mfaSetup.text6')}</h1>
                <p className="text-muted-foreground mt-2 text-sm">{t('mfaSetup.desc2')}</p>
              </div>
            </CardHeader>
            <CardContent className="pb-8 space-y-6">
              {qrCode && (
                <div className="flex justify-center">
                  <img src={qrCode} alt={t('mfaSetup.text7')} className="w-48 h-48 rounded-lg border border-border" />
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
                {isVerifying ? t('text.mfasetup.verifying', 'Verifying...') : t('text.mfasetup.verifyEnable', 'Verify & Enable')}
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
                <h1 className="text-2xl font-bold text-foreground">{t('mfaSetup.text8')}</h1>
                <p className="text-muted-foreground mt-2 text-sm">{t('mfaSetup.desc3')}</p>
              </div>
            </CardHeader>
            <CardContent className="pb-8">
              <RainbowButton onClick={() => navigate('/home', { replace: true })} className="w-full">
                Continue
              </RainbowButton>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
