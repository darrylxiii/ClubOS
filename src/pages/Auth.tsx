import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "@/lib/motion";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Lock, CheckCircle2, AlertTriangle, RefreshCw, Users, Building2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UnifiedLoader } from "@/components/ui/unified-loader";
import { AssistedPasswordConfirmation } from "@/components/ui/assisted-password-confirmation";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { useLoginLockout } from "@/hooks/useLoginLockout";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { logger } from "@/lib/logger";
import { signInWithOAuthCustomDomain } from "@/lib/oauth-helpers";
import { SetPasswordModal } from "@/components/auth/SetPasswordModal";
import { ShaderAnimation } from "@/components/auth/ShaderAnimation";

// Lazy load heavy components to reduce initial bundle
const OAuthDiagnostics = lazy(() => import("@/components/OAuthDiagnostics").then(m => ({
  default: m.OAuthDiagnostics
})));

// Inline Google icon SVG to avoid react-icons bundle size
const GoogleIcon = () => <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>;
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";
const emailSchema = z.string().email();
const passwordSchema = z.string().min(12).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/);
interface InviteInfo {
  valid: boolean;
  message?: string;
  referrerName?: string;
  recipientName?: string;
  recipientEmail?: string;
  companyName?: string;
  targetRole?: string;
}

const Auth = () => {
  const {
    user,
    loading,
    session
  } = useAuth();
  const {
    resolvedTheme
  } = useTheme();
  const {
    t
  } = useTranslation('auth');
  const {
    t: tCommon
  } = useTranslation('common');
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("invite");
  const prefillEmail = searchParams.get("email");
  const [isLogin, setIsLogin] = useState(!inviteCode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteValidating, setInviteValidating] = useState(false);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);
  const [oauthProcessing, setOauthProcessing] = useState(false);
  const [setPasswordOpen, setSetPasswordOpen] = useState(false);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const {
    checkLockout,
    recordAttempt
  } = useLoginLockout();
  const navigate = useNavigate();

  // OAuth callback handler - exchanges code for session BEFORE cleaning URL
  // Also handles pre-linking for pre-provisioned partners
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');
      const errorDescription = params.get('error_description');
      const code = params.get('code');

      // Handle OAuth errors first
      if (error) {
        logger.error('OAuth error', new Error(errorDescription || error), {
          componentName: 'Auth',
          error
        });
        toast.error(`Sign in failed: ${errorDescription || error}`);
        localStorage.removeItem('pending_invite_code');
        window.history.replaceState({}, '', '/auth');
        return;
      }

      // If we have a code parameter, this is an OAuth callback that needs processing
      if (code) {
        logger.debug('OAuth callback detected with code', {
          componentName: 'Auth'
        });
        setOauthProcessing(true);
        try {
          // Let Supabase's detectSessionInUrl handle the exchange automatically
          // Just wait for the session to be established
          let attempts = 0;
          const maxAttempts = 20; // 10 seconds max wait

          while (attempts < maxAttempts) {
            const {
              data: {
                session: currentSession
              }
            } = await supabase.auth.getSession();
            if (currentSession?.user) {
              logger.debug('OAuth session established successfully', {
                componentName: 'Auth'
              });

              // Check if this is a pre-provisioned partner account that needs identity linking
              try {
                const userEmail = currentSession.user.email;
                if (userEmail) {
                  const {
                    data: profile
                  } = await supabase.from('profiles').select('id, preferred_auth_method').eq('email', userEmail).maybeSingle();
                  if (profile?.preferred_auth_method === 'oauth_only') {
                    // Link Google identity for seamless OAuth login
                    const googleIdentities = currentSession.user.identities?.filter(i => i.provider === 'google') || [];
                    if (googleIdentities.length === 0) {
                      logger.debug('Pre-provisioned partner: linking Google identity', {
                        componentName: 'Auth'
                      });
                      // Identity should already be linked by Supabase auth system
                      // Just confirm the preference is set
                      await supabase.from('profiles').update({
                        preferred_auth_method: 'oauth_only'
                      }).eq('id', profile.id);
                    }
                  }
                }
              } catch (err) {
                logger.warn('Failed to check pre-provisioning status', {
                  componentName: 'Auth',
                  err
                });
                // Continue anyway - this is non-critical
              }

              // Consume pending invite code for OAuth signups
              const pendingInvite = localStorage.getItem('pending_invite_code');
              if (pendingInvite) {
                try {
                  const { data: consumeResult } = await supabase.functions.invoke('consume-invite', {
                    body: { code: pendingInvite }
                  });
                  if (consumeResult?.success) {
                    logger.debug('OAuth invite code consumed', { componentName: 'Auth' });
                  }
                } catch (err) {
                  logger.warn('Failed to consume invite on OAuth (non-blocking)', { componentName: 'Auth', err });
                }
                localStorage.removeItem('pending_invite_code');
              }

              // Clean up URL only after session is confirmed
              window.history.replaceState({}, '', '/auth');
              setOauthProcessing(false);
              return;
            }

            // Wait 500ms before checking again
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
          }

          // If we get here, session wasn't established in time
          logger.warn('OAuth session not established after waiting', {
            componentName: 'Auth'
          });
          toast.error('Sign in timed out. Please try again.');
          window.history.replaceState({}, '', '/auth');
        } catch (err) {
          logger.error('OAuth callback processing error', err instanceof Error ? err : new Error(String(err)), {
            componentName: 'Auth'
          });
          toast.error('Sign in failed. Please try again.');
          window.history.replaceState({}, '', '/auth');
        } finally {
          setOauthProcessing(false);
        }
      }
    };
    handleOAuthCallback();
  }, []);
  useEffect(() => {
    const pendingInvite = localStorage.getItem('pending_invite_code');
    if (pendingInvite && !inviteCode) {
      const url = new URL(window.location.href);
      url.searchParams.set('invite', pendingInvite);
      window.history.replaceState({}, '', url.toString());
      localStorage.removeItem('pending_invite_code');
      validateInviteCode(pendingInvite);
    }
  }, []);
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Don't navigate while OAuth is still processing
      if (oauthProcessing) return;
      if (!loading && user && session && !mfaRequired) {
        // Partners with force_password_change are routed by ProtectedRoute → /partner-setup
        if (user.user_metadata?.force_password_change === true) {
          logger.debug('Partner with force_password_change, skipping onboarding redirect', {
            componentName: 'Auth',
          });
          navigate('/partner-setup');
          return;
        }
        try {
          // Check if user has completed onboarding
          const {
            data: profile,
            error
          } = await supabase.from('profiles').select('onboarding_completed_at').eq('id', user.id).maybeSingle();
          if (error) {
            logger.warn('Failed to fetch profile for onboarding check', {
              componentName: 'Auth',
              error
            });
            // Safe default: route to onboarding
            navigate("/oauth-onboarding");
            return;
          }
          if (!profile?.onboarding_completed_at) {
            logger.debug('User needs to complete onboarding', {
              componentName: 'Auth'
            });
            navigate("/oauth-onboarding");
          } else {
            logger.debug('User authenticated, navigating to /home', {
              componentName: 'Auth'
            });
            navigate("/home");
          }
        } catch (err) {
          logger.error('Error checking onboarding status', err instanceof Error ? err : new Error(String(err)), {
            componentName: 'Auth'
          });
          // Safe default: route to onboarding
          navigate("/oauth-onboarding");
        }
      }
    };
    checkOnboardingStatus();
  }, [loading, user, session, mfaRequired, oauthProcessing, navigate]);
  useEffect(() => {
    if (inviteCode) {
      validateInviteCode(inviteCode);
    }
  }, [inviteCode]);
  useEffect(() => {
    if (prefillEmail) {
      setEmail(decodeURIComponent(prefillEmail));
      setIsLogin(true);
      toast.info(t('login.pleaseEnterPassword'));
    }
  }, [prefillEmail, t]);
  const validateInviteCode = async (code: string) => {
    setInviteValidating(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('validate-invite-code', {
        body: {
          code
        }
      });
      if (error) throw error;
      if (data?.valid) {
        setInviteValid(true);
        setInviteInfo({
          valid: true,
          referrerName: data.referrerName,
          recipientName: data.recipientName,
          recipientEmail: data.recipientEmail,
          companyName: data.companyName,
          targetRole: data.targetRole,
        });
        // Pre-fill form fields from invite metadata
        if (data.recipientName && !fullName) setFullName(data.recipientName);
        if (data.recipientEmail && !email) setEmail(data.recipientEmail);
        toast.success(data.message || t('invite.validMessage'));
      } else {
        setInviteValid(false);
        toast.error(data?.message || t('invite.invalidOrExpired'));
      }
    } catch (error) {
      logger.error("Invite validation failed", error instanceof Error ? error : new Error(String(error)), { componentName: 'Auth' });
      setInviteValid(false);
      toast.error(t('invite.errorValidating'));
    } finally {
      setInviteValidating(false);
    }
  };
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      emailSchema.parse(email);
      if (!isLogin) {
        passwordSchema.parse(password);
        if (password !== confirmPassword) {
          toast.error(t('errors.passwordMismatch'));
          return;
        }
      }
      if (isLogin) {
        // Check for account lockout before attempting login
        const lockoutStatus = await checkLockout(email);
        if (lockoutStatus.locked) {
          setLockoutMessage(lockoutStatus.message || t('errors.accountLocked'));
          toast.error(lockoutStatus.message || t('errors.tooManyAttempts'));
          return;
        }
        setLockoutMessage(null);
        const {
          data,
          error
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          await recordAttempt(email, false);
          if (error.message.includes("Invalid login credentials")) {
            toast.error(t('errors.invalidCredentials'));
          } else if (error.message.includes("Email not confirmed")) {
            toast.error(t('errors.emailNotVerified'));
            setNeedsEmailVerification(true);
          } else {
            toast.error(error.message);
          }
          return;
        }

        // Record successful attempt (clears failed attempts)
        await recordAttempt(email, true);
        if (!data.session && data.user) {
          const factors = data.user.factors || [];
          const verifiedFactor = factors.find(f => f.status === 'verified');
          if (verifiedFactor) {
            const {
              data: challengeData,
              error: challengeError
            } = await supabase.auth.mfa.challenge({
              factorId: verifiedFactor.id
            });
            if (challengeError) {
              toast.error(t('errors.failed2FA'));
              return;
            }
            setMfaFactorId(verifiedFactor.id);
            setMfaChallengeId(challengeData.id);
            setMfaRequired(true);
            toast.info(t('mfa.pleaseEnter2FA'));
            return;
          }
        }
        if (data?.session) {
          logger.debug('Login successful', {
            componentName: 'Auth'
          });
        }
      } else {
        if (!fullName.trim()) {
          toast.error(t('errors.fullNameRequired'));
          return;
        }
        const redirectUrl = `${window.location.origin}/`;
        const {
          data: authData,
          error
        } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: fullName,
              ...(inviteCode ? { invite_code: inviteCode } : {})
            }
          }
        });
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error(t('errors.alreadyRegistered'));
            setIsLogin(true);
          } else {
            toast.error(error.message);
          }
          return;
        }

        // Consume invite code after successful signup (assigns company + role)
        if (inviteCode && authData?.user) {
          try {
            const { data: consumeResult, error: consumeError } = await supabase.functions.invoke('consume-invite', {
              body: { code: inviteCode }
            });
            if (consumeError) {
              logger.warn('Failed to consume invite code', { componentName: 'Auth', error: consumeError });
            } else if (consumeResult?.success) {
              logger.debug('Invite code consumed successfully', { componentName: 'Auth', result: consumeResult });
            }
          } catch (err) {
            logger.warn('Invite consumption error (non-blocking)', { componentName: 'Auth', err });
          }
          localStorage.removeItem('pending_invite_code');
        }

        if (authData?.user && !authData.session) {
          toast.success(t('messages.verificationEmailSent'));
          setNeedsEmailVerification(true);
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(t('errors.weakPassword'));
      } else if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };
  const handleGoogleAuth = async () => {
    try {
      if (inviteCode) {
        localStorage.setItem('pending_invite_code', inviteCode);
      }
      const redirectUrl = inviteCode ? `${window.location.origin}/auth?invite=${inviteCode}` : `${window.location.origin}/auth`;

      await signInWithOAuthCustomDomain({
        provider: 'google',
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('errors.failedToInitiate', {
        provider: t('oauth.google')
      }));
    }
  };
  const handleAppleAuth = async () => {
    try {
      if (inviteCode) {
        localStorage.setItem('pending_invite_code', inviteCode);
      }
      const redirectUrl = inviteCode ? `${window.location.origin}/auth?invite=${inviteCode}` : `${window.location.origin}/auth`;

      await signInWithOAuthCustomDomain({
        provider: 'apple',
        redirectTo: redirectUrl,
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('errors.failedToInitiate', {
        provider: t('oauth.apple')
      }));
    }
  };
  const handleLinkedInAuth = async () => {
    try {
      if (inviteCode) {
        localStorage.setItem('pending_invite_code', inviteCode);
      }
      const redirectUrl = inviteCode ? `${window.location.origin}/auth?invite=${inviteCode}` : `${window.location.origin}/auth`;

      await signInWithOAuthCustomDomain({
        provider: 'linkedin_oidc',
        redirectTo: redirectUrl,
        scopes: 'openid profile email',
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('errors.failedToInitiate', {
        provider: t('oauth.linkedin')
      }));
    }
  };
  const handleVerifyEmail = async () => {
    if (emailVerificationCode.length !== 6) {
      toast.error(t('verification.validCode'));
      return;
    }
    setVerificationLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('verify-email-code', {
        body: {
          email,
          code: emailVerificationCode
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(t('messages.emailVerified'));
      setNeedsEmailVerification(false);
      setEmailVerificationCode("");
      setIsLogin(true);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('mfa.invalidCode'));
    } finally {
      setVerificationLoading(false);
    }
  };
  const handleVerifyMFA = async () => {
    if (mfaCode.length !== 6) {
      toast.error(t('verification.validCode'));
      return;
    }
    if (!mfaFactorId || !mfaChallengeId) {
      toast.error(t('mfa.noChallengeFound'));
      setMfaRequired(false);
      return;
    }
    setVerificationLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: mfaCode
      });
      if (error) throw error;
      if (data) {
        setMfaRequired(false);
        navigate("/home");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('errors.invalid2FACode'));
      setMfaCode("");
    } finally {
      setVerificationLoading(false);
    }
  };
  if (loading || oauthProcessing) {
    return <UnifiedLoader variant="page" showBranding />;
  }
  return <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <ShaderAnimation />
      <motion.div
        className="relative z-10"
        initial={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
      <Card className="w-full max-w-2xl bg-card/85 backdrop-blur-[16px] border-border/50 shadow-glass-md shadow-inner rounded-2xl">
        <CardHeader className="space-y-6 pb-8 text-center pt-12">
          <div className="flex items-center justify-center mb-2 drop-shadow-lg">
            <img src={quantumLogoDark} alt="The Quantum Club" className="h-24 w-auto dark:hidden" fetchPriority="high" />
            <img src={quantumLogoLight} alt="The Quantum Club" className="h-24 w-auto hidden dark:block" fetchPriority="high" />
          </div>

          <div className="space-y-3">
            <h1 className="tracking-tight text-foreground font-bold text-3xl">
              {isLogin ? t('login.title') : t('signup.title')}
            </h1>
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-foreground/90" />
              <p className="text-sm text-foreground/90 font-semibold">{t('signup.inviteOnly')}</p>
            </div>
          </div>

          {inviteValidating && (
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/30 animate-pulse space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Validating invite code…</p>
              </div>
            </div>
          )}

          {!inviteValidating && inviteValid && inviteInfo && <div className="p-4 rounded-2xl bg-success/10 border border-success/20 backdrop-blur-sm space-y-2">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <p className="text-sm font-bold text-success">{t('invite.valid')}</p>
              </div>
              <p className="text-xs text-foreground/80">
                {inviteInfo.targetRole === 'partner' && inviteInfo.recipientName
                  ? `Welcome, ${inviteInfo.recipientName}. ${inviteInfo.referrerName ? `${inviteInfo.referrerName} has` : 'You have been'} invited to join as a partner.`
                  : inviteInfo.referrerName ? t('invite.invitedBy', {
                name: inviteInfo.referrerName
              }) : t('invite.invitedByMember')}
              </p>
              {inviteInfo.companyName && (
                <p className="text-xs text-foreground/60 flex items-center justify-center gap-1">
                  <Building2 className="h-3 w-3" /> {inviteInfo.companyName}
                </p>
              )}
            </div>}

          {!inviteValidating && inviteValid === false && <Alert className="bg-destructive/10 border-destructive/20 backdrop-blur-sm rounded-2xl">
              <AlertDescription className="text-sm font-medium text-destructive text-center">
                {t('invite.invalidOrExpired')}
              </AlertDescription>
            </Alert>}
        </CardHeader>

        <CardContent className="pt-2 px-10 pb-10">
          {needsEmailVerification ? <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                <p className="text-sm font-bold text-primary text-center">{t('verification.title')}</p>
                <p className="text-xs text-foreground/80 text-center">
                  {t('verification.codeSentTo', {
                email
              })}
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP maxLength={6} value={emailVerificationCode} onChange={setEmailVerificationCode} disabled={verificationLoading}>
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

              <RainbowButton onClick={handleVerifyEmail} disabled={emailVerificationCode.length !== 6 || verificationLoading} className="w-full h-16 rounded-2xl">
                {verificationLoading ? t('verification.verifying') : t('verification.verify')}
              </RainbowButton>

              <button type="button" onClick={() => {
            setNeedsEmailVerification(false);
            setEmailVerificationCode("");
          }} className="text-foreground/80 hover:text-foreground text-sm w-full text-center">
                {t('resetPassword.backToLogin')}
              </button>
            </div> : mfaRequired ? <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                <p className="text-sm font-bold text-primary text-center">{t('mfa.title')}</p>
                <p className="text-xs text-foreground/80 text-center">
                  {t('mfa.subtitle')}
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode} disabled={verificationLoading}>
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

              <RainbowButton onClick={handleVerifyMFA} disabled={mfaCode.length !== 6 || verificationLoading} className="w-full h-16 rounded-2xl">
                {verificationLoading ? t('verification.verifying') : t('mfa.verify')}
              </RainbowButton>

              <button type="button" onClick={() => {
            setMfaRequired(false);
            setMfaCode("");
          }} className="text-foreground/80 hover:text-foreground text-sm w-full text-center">
                {t('resetPassword.backToLogin')}
              </button>
            </div> : <form onSubmit={handleEmailAuth} className="space-y-5">
              {/* Account Lockout Warning */}
              {lockoutMessage && <Alert className="bg-destructive/10 border-destructive/20 backdrop-blur-sm rounded-2xl">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-sm font-medium text-destructive">
                    {lockoutMessage}
                  </AlertDescription>
                </Alert>}

              {!isLogin && (
                <div>
                  <label htmlFor="auth-fullname" className="sr-only">{t('signup.fullName')}</label>
                  <Input id="auth-fullname" type="text" placeholder={t('signup.fullName')} value={fullName} onChange={e => setFullName(e.target.value)} className="h-14 rounded-xl glass-input" required />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="sr-only">{t('login.email')}</label>
                <Input id="auth-email" type="email" placeholder={t('login.email')} value={email} onChange={e => setEmail(e.target.value)} className="h-14 rounded-xl" required />
              </div>

              {isLogin ? (
                <div>
                  <label htmlFor="auth-password" className="sr-only">{t('login.password')}</label>
                  <Input id="auth-password" type="password" placeholder={t('login.password')} value={password} onChange={e => setPassword(e.target.value)} className="h-14 rounded-xl" required />
                </div>
              ) : <AssistedPasswordConfirmation password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword} />}

              <RainbowButton type="submit" disabled={isLoading || !isLogin && inviteValid !== true} className="w-full h-14 rounded-xl font-semibold text-base">
                {isLoading ? tCommon('actions.loading') : isLogin ? t('login.signIn') : t('signup.createAccount')}
              </RainbowButton>

              <div className="pt-4" />

              {/* OAuth buttons — hidden until properly configured */}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowAccessDialog(true)}
                  className="text-foreground/80 hover:text-foreground text-sm transition-colors"
                >
                  Request Access
                </button>
              </div>

              <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
                <DialogContent className="backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-center text-lg">Request Access</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="w-full h-12 text-base gap-2"
                      onClick={() => { setShowAccessDialog(false); navigate('/onboarding'); }}
                    >
                      <Users className="h-5 w-5" />
                      For Members
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-12 text-base gap-2"
                      onClick={() => { setShowAccessDialog(false); navigate('/partner'); }}
                    >
                      <Building2 className="h-5 w-5" />
                      For Partners
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {isLogin && <div className="text-center space-y-1">
                  <Link to="/forgot-password" className="text-sm text-foreground/70 hover:text-foreground block">
                    {t('login.forgotPassword')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSetPasswordOpen(true)}
                    className="text-sm text-foreground/50 hover:text-foreground transition-colors"
                  >
                    {t('setPassword.noPassword')} <span className="underline">{t('setPassword.setOne')}</span>
                  </button>
                </div>}
            </form>}
        </CardContent>
      </Card>

      </motion.div>
      {resolvedTheme === 'dark' && <OAuthDiagnostics />}
      <SetPasswordModal open={setPasswordOpen} onOpenChange={setSetPasswordOpen} />
    </div>;
};
export default Auth;