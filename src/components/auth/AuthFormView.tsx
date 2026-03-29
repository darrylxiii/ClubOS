import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, useReducedMotion } from "@/lib/motion";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Lock, CheckCircle2, AlertTriangle, Users, Building2, Loader2, Mail, Wand2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UnifiedLoader } from "@/components/ui/unified-loader";
import { AssistedPasswordConfirmation } from "@/components/ui/assisted-password-confirmation";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginLockout } from "@/hooks/useLoginLockout";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { logger } from "@/lib/logger";
import { signInWithOAuthCustomDomain } from "@/lib/oauth-helpers";
import { getAuthMotionPreset } from "@/components/auth/authMotion";
import { getMarketingSiteUrl } from "@/lib/marketing-site";

import { SetPasswordModal } from "@/components/auth/SetPasswordModal";

/**
 * LCP OPTIMIZATION: Use stable public/ URLs instead of Vite-hashed imports.
 * This lets the <link rel="preload"> in index.html match the <img src>,
 * eliminating the wasted preload and allowing the browser to reuse the
 * already-downloaded resource. (~800ms LCP improvement)
 */
const logoLightTheme = '/quantum-club-logo.png';
const logoDarkTheme = '/quantum-logo-dark.png';

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

export interface AuthFormViewProps {
  layout?: 'page' | 'dialog';
  onRequestClose?: () => void;
}

export function AuthFormView({ layout = 'page', onRequestClose }: AuthFormViewProps) {
  const {
    user,
    loading,
    session
  } = useAuth();
  const {
    t
  } = useTranslation('auth');
  const {
    t: tCommon
  } = useTranslation('common');
  const queryClient = useQueryClient();
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
  const marketingSiteUrl = getMarketingSiteUrl();
  const [setPasswordOpen, setSetPasswordOpen] = useState(false);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const motionPreset = getAuthMotionPreset(!!shouldReduceMotion);
  const {
    checkLockout,
    recordAttempt
  } = useLoginLockout();
  const navigate = useNavigate();

  // OAuth callback handler — handles BOTH flows:
  //   1. PKCE code flow (production custom domain): ?code=... in query string
  //   2. Implicit flow (localhost / non-HTTPS): #access_token=... in hash fragment
  // Also handles magic-link returns which arrive as hash fragments.
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : ''
      );

      // Errors can come in query params OR hash fragments
      const error = params.get('error') || hashParams.get('error');
      const errorDescription =
        params.get('error_description') || hashParams.get('error_description');

      // PKCE code flow uses ?code=, implicit flow uses #access_token=
      const code = params.get('code');
      const hashAccessToken = hashParams.get('access_token');
      const hasAuthCallback = !!(code || hashAccessToken);

      // Handle OAuth errors first
      if (error) {
        logger.error('OAuth error', new Error(errorDescription || error), {
          componentName: 'Auth',
          error
        });
        toast.error(
          t('oauth.signInFailedWithDetail', {
            detail: errorDescription || error,
          }),
        );
        localStorage.removeItem('pending_invite_code');
        window.history.replaceState({}, '', '/auth');
        return;
      }

      // Process auth callback from either flow
      if (hasAuthCallback) {
        logger.debug(
          code
            ? 'OAuth callback detected with code (PKCE flow)'
            : 'OAuth callback detected with hash tokens (implicit flow)',
          { componentName: 'Auth' },
        );
        setOauthProcessing(true);
        try {
          // For hash-fragment callbacks (implicit flow / magic links),
          // Supabase's detectSessionInUrl needs to parse the hash.
          // Calling getSession() again after a microtask gives it time to process.
          if (hashAccessToken) {
            // Give Supabase client a tick to pick up the hash fragment.
            // The `detectSessionInUrl: true` option handles this automatically,
            // but it runs asynchronously — we wait for it to finish.
            await new Promise(resolve => setTimeout(resolve, 150));
          }

          // Poll for session establishment
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

              // Clean up URL (code param or hash fragment) only after session is confirmed
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
          toast.error(t('text.auth.signInTimedOutPleaseTry', 'Sign in timed out. Please try again.'));
          window.history.replaceState({}, '', '/auth');
        } catch (err) {
          logger.error('OAuth callback processing error', err instanceof Error ? err : new Error(String(err)), {
            componentName: 'Auth'
          });
          toast.error(t('text.auth.signInFailedPleaseTryAgain', 'Sign in failed. Please try again.'));
          window.history.replaceState({}, '', '/auth');
        } finally {
          setOauthProcessing(false);
        }
      }
    };
    handleOAuthCallback();
  }, [t]);
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

        // Retry consume-invite for users who signed up with an invite code
        // but the initial consume failed (e.g. no session during email verification)
        const pendingInviteCode = user.user_metadata?.invite_code;
        if (pendingInviteCode) {
          try {
            const { data: existingRoles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id);

            // Only retry if user has no roles assigned yet (consume failed initially)
            if (!existingRoles || existingRoles.length === 0) {
              logger.debug('Retrying consume-invite for pending invite code', {
                componentName: 'Auth',
              });
              const { data: consumeResult } = await supabase.functions.invoke('consume-invite', {
                body: { code: pendingInviteCode },
              });
              if (consumeResult?.success) {
                logger.debug('Invite code consumed on retry', { componentName: 'Auth' });
                
                // Refresh session to pick up updated metadata (force_password_change, roles)
                await supabase.auth.refreshSession();
                const { data: { user: refreshedUser } } = await supabase.auth.getUser();
                if (refreshedUser?.user_metadata?.force_password_change === true) {
                  navigate('/partner-setup');
                  return;
                }
              }
            }
          } catch (err) {
            logger.warn('consume-invite retry failed (non-blocking)', {
              componentName: 'Auth',
              err,
            });
          }
        }

        try {
          // Fetch roles and profile in parallel — include substantive fields
          // to detect legacy users who already have data but no onboarding timestamp
          const [rolesResult, profileResult] = await Promise.all([
            supabase.from('user_roles').select('role').eq('user_id', user.id),
            supabase.from('profiles')
              .select('onboarding_completed_at, full_name, phone, current_title, account_status')
              .eq('id', user.id)
              .maybeSingle(),
          ]);

          const roles = rolesResult.data?.map(r => r.role) || [];
          const isElevatedRole = roles.includes('partner') || roles.includes('admin') || roles.includes('strategist');

          // Partners, admins, and strategists skip candidate onboarding
          if (isElevatedRole) {
            logger.debug('Elevated role detected, skipping onboarding check', {
              componentName: 'Auth',
              roles,
            });
            navigate("/home");
            return;
          }

          if (profileResult.error) {
            logger.warn('Failed to fetch profile for onboarding check, falling through to /home', {
              componentName: 'Auth',
              error: profileResult.error,
            });
            // Route to /home — ProtectedRoute will handle the guard properly.
            // Never send to /oauth-onboarding on error; that punishes existing users during transient failures.
            navigate("/home");
            return;
          }

          const profile = profileResult.data;

          // Detect legacy/existing users who have substantive profile data
          // but never went through the formal onboarding wizard
          const hasSubstantiveProfile = !!(
            profile?.phone ||
            profile?.current_title ||
            (profile?.full_name && profile.full_name.trim() !== '' && roles.length > 0)
          );

          if (profile?.onboarding_completed_at || hasSubstantiveProfile) {
            // User is already onboarded OR has existing data — go home
            if (hasSubstantiveProfile && !profile?.onboarding_completed_at) {
              // Backfill the timestamp + write audit event so admins have a trail
              const backfillTimestamp = new Date().toISOString();
              Promise.all([
                supabase.from('profiles').update({
                  onboarding_completed_at: backfillTimestamp,
                }).eq('id', user.id),
                supabase.from('activation_events').insert({
                  user_id: user.id,
                  event_type: 'onboarding_auto_backfilled',
                  event_category: 'onboarding',
                  milestone_name: 'legacy_user_detected',
                  event_data: {
                    reason: 'substantive_profile_data_detected',
                    fields_found: [
                      profile?.phone ? 'phone' : null,
                      profile?.current_title ? 'current_title' : null,
                      profile?.full_name ? 'full_name' : null,
                    ].filter(Boolean),
                    backfilled_at: backfillTimestamp,
                  },
                }),
              ]).then(() => {
                // Invalidate the auth-prefetch cache so ProtectedRoute picks up the new timestamp
                queryClient.invalidateQueries({ queryKey: ['auth-prefetch', user.id] });
                logger.debug('Backfilled onboarding_completed_at for legacy user with audit trail', {
                  componentName: 'Auth',
                });
              }).catch((backfillErr) => {
                logger.warn('Backfill/audit write failed (non-blocking)', {
                  componentName: 'Auth',
                  error: backfillErr,
                });
              });
            }
            logger.debug('User authenticated, navigating to /home', {
              componentName: 'Auth',
            });
            navigate("/home");
          } else {
            logger.debug('User needs to complete onboarding', {
              componentName: 'Auth',
            });
            navigate("/oauth-onboarding");
          }
        } catch (err) {
          logger.error('Error checking onboarding status, falling through to /home', err instanceof Error ? err : new Error(String(err)), {
            componentName: 'Auth'
          });
          // Route to /home — ProtectedRoute handles the guard.
          // Never punish existing users with onboarding on transient errors.
          navigate("/home");
        }
      }
    };
    checkOnboardingStatus();
  }, [loading, user, session, mfaRequired, oauthProcessing, navigate, queryClient]);
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
  useEffect(() => {
    if (layout !== "dialog" || !isLogin || needsEmailVerification || mfaRequired || showAccessDialog) return;
    const delay = shouldReduceMotion ? 40 : 240;
    const timer = window.setTimeout(() => emailInputRef.current?.focus(), delay);
    return () => window.clearTimeout(timer);
  }, [layout, isLogin, needsEmailVerification, mfaRequired, showAccessDialog, shouldReduceMotion]);
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
        toast.success(data.message || t('inviteSection.validMessage'));
      } else {
        setInviteValid(false);
        toast.error(data?.message || t('inviteSection.invalidOrExpired'));
      }
    } catch (error) {
      logger.error("Invite validation failed", error instanceof Error ? error : new Error(String(error)), { componentName: 'Auth' });
      setInviteValid(false);
      toast.error(t('inviteSection.errorValidating'));
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
        const redirectUrl = `${window.location.origin}/auth`;
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
        const i0 = error.issues[0];
        const isEmailShape =
          i0?.validation === 'email' ||
          (i0?.code === 'invalid_string' && String(i0?.message).toLowerCase().includes('email'));
        toast.error(isEmailShape ? t('errors.invalidEmail') : t('errors.weakPassword'));
      } else if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };
  const handleMagicLink = async () => {
    if (!email) {
      toast.error(t('text.auth.pleaseEnterYourEmailAddressFirst', 'Please enter your email address first'));
      return;
    }
    try {
      emailSchema.parse(email);
    } catch {
      toast.error(t('text.auth.pleaseEnterAValidEmailAddress', 'Please enter a valid email address'));
      return;
    }
    setMagicLinkLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      const { error: fnError } = await supabase.functions.invoke('send-magic-link-email', {
        body: { email, redirectTo: redirectUrl },
      });

      if (!fnError) {
        setMagicLinkSent(true);
        toast.success(t('login.magicLink.toastSent'));
        return;
      }

      const isTransportFailure =
        fnError instanceof Error &&
        (fnError.name === 'FunctionsFetchError' || fnError.name === 'FunctionsRelayError');

      if (isTransportFailure) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectUrl },
        });
        if (otpError) throw otpError;
        setMagicLinkSent(true);
        toast.success(t('login.magicLink.toastSent'));
        return;
      }

      throw fnError;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('text.auth.failedToSendMagicLink', 'Failed to send magic link'));
    } finally {
      setMagicLinkLoading(false);
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
        scopes: 'openid profile email',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('errors.failedToInitiate', {
        provider: 'oauth.google'
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
        provider: 'oauth.apple'
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
        provider: 'oauth.linkedin'
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
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('errors.invalid2FACode'));
      setMfaCode("");
    } finally {
      setVerificationLoading(false);
    }
  };
  if (loading || oauthProcessing) {
    if (layout === 'dialog') {
      return (
        <div className="flex min-h-[280px] w-full items-center justify-center py-8">
          <UnifiedLoader variant="section" showBranding className="min-h-[200px]" />
        </div>
      );
    }
    return <UnifiedLoader variant="page" showBranding />;
  }

  const cardAndNav = (
    <>
      <Card className="relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-[64px] dark:border-white/[0.05] dark:bg-black/40">
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/5 dark:ring-white/[0.02]" />
        <motion.div
          variants={layout === "dialog" ? motionPreset.header : undefined}
          initial={layout === "dialog" ? "hidden" : undefined}
          animate={layout === "dialog" ? "visible" : undefined}
          exit={layout === "dialog" ? "exit" : undefined}
        >
          <CardHeader className="space-y-6 pb-8 text-center pt-12">
          <div className="flex items-center justify-center mb-2 drop-shadow-lg">
            <img src={logoLightTheme} alt="" className="h-24 w-auto dark:hidden" fetchPriority="high" decoding="async" width="240" height="96" loading="eager" />
            <img src={logoDarkTheme} alt="" className="h-24 w-auto hidden dark:block" fetchPriority="high" decoding="async" width="240" height="96" loading="eager" />
          </div>
          <p className="text-center text-sm font-semibold tracking-tight text-foreground/90 -mt-2 mb-1">
            {t('login.brandTagline')}
          </p>

          <div className="space-y-4">
            <h1 className="tracking-tighter font-semibold text-3xl sm:text-4xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 drop-shadow-[0_2px_8px_rgba(255,255,255,0.1)] pb-1">
              {isLogin
                ? t('login.title', 'Welcome Back')
                : inviteInfo?.targetRole === 'partner'
                  ? t('signup.partnerSetup', 'Activate Capital Partnership')
                  : t('signup.title', 'Activate Syndicate Access')}
            </h1>
            <div className="mx-auto flex w-fit items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-3.5 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-xl">
              {inviteInfo?.targetRole === 'partner' ? (
                <>
                  <Building2 className="w-3.5 h-3.5 text-white/80 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                  <p className="text-[12px] text-white/90 font-medium tracking-[0.05em] uppercase drop-shadow-sm">{t('text.auth.partnerAccount', 'Partner Account')}</p>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-white/80 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                  <p className="text-[12px] text-white/90 font-medium tracking-[0.05em] uppercase drop-shadow-sm">{t('signup.inviteOnly', 'INVITE-ONLY')}</p>
                </>
              )}
            </div>
          </div>

          {inviteValidating && (
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/30 animate-pulse space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t('text.auth.validatingInviteCode', 'Validating invite code…')}</p>
              </div>
            </div>
          )}

          {!inviteValidating && inviteValid && inviteInfo && <div className="p-4 rounded-2xl bg-success/10 border border-success/20 backdrop-blur-sm space-y-2">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <p className="text-sm font-bold text-success">{t('inviteSection.valid', 'Valid Invite')}</p>
              </div>
              <p className="text-xs text-foreground/80">
                {inviteInfo.targetRole === 'partner' && inviteInfo.recipientName
                  ? inviteInfo.referrerName
                    ? t('inviteSection.partnerWelcomeWithReferrer', {
                        recipientName: inviteInfo.recipientName,
                        referrerName: inviteInfo.referrerName,
                      })
                    : t('inviteSection.partnerWelcomeSelf', { recipientName: inviteInfo.recipientName })
                  : inviteInfo.referrerName
                    ? t('inviteSection.invitedBy', { name: inviteInfo.referrerName })
                    : t('inviteSection.invitedByMember')}
              </p>
              {inviteInfo.companyName && (
                <p className="text-xs text-foreground/60 flex items-center justify-center gap-1">
                  <Building2 className="h-3 w-3" /> {inviteInfo.companyName}
                </p>
              )}
            </div>}

          {!inviteValidating && inviteValid === false && <Alert className="bg-destructive/10 border-destructive/20 backdrop-blur-sm rounded-2xl">
              <AlertDescription className="text-sm font-medium text-destructive text-center">
                {t('inviteSection.invalidOrExpired')}
              </AlertDescription>
            </Alert>}
          </CardHeader>
        </motion.div>

        <motion.div
          variants={layout === "dialog" ? motionPreset.content : undefined}
          initial={layout === "dialog" ? "hidden" : undefined}
          animate={layout === "dialog" ? "visible" : undefined}
          exit={layout === "dialog" ? "exit" : undefined}
        >
          <CardContent className="pt-2 px-10 pb-10">
          {needsEmailVerification ? <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                <p className="text-sm font-bold text-primary text-center">{t('verification.title', 'Email Verification')}</p>
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
                {verificationLoading ? t('verification.verifying', 'Verifying…') : t('verification.verify', 'Verify Email')}
              </RainbowButton>

              <button type="button" onClick={() => {
            setNeedsEmailVerification(false);
            setEmailVerificationCode("");
           }} className="text-foreground/90 hover:text-foreground hover:underline text-sm w-full text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded">
                {t('resetPassword.backToLogin', 'Back to Login')}
              </button>
            </div> : mfaRequired ? <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                <p className="text-sm font-bold text-primary text-center">{t('mfa.title', 'Two-Factor Authentication')}</p>
                <p className="text-xs text-foreground/80 text-center">
                  {t('mfa.subtitle', 'Enter the 6-digit code from your authenticator app')}
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
                {verificationLoading ? t('verification.verifying', 'Verifying…') : t('mfa.verify', 'Verify')}
              </RainbowButton>

              <button type="button" onClick={() => {
            setMfaRequired(false);
            setMfaCode("");
          }} className="text-foreground/90 hover:text-foreground hover:underline text-sm w-full text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded">
                {t('resetPassword.backToLogin', 'Back to Login')}
              </button>
            </div> : isLogin ? <div className="space-y-5">
              {/* Account Lockout Warning */}
              {lockoutMessage && <Alert className="bg-destructive/10 border-destructive/20 backdrop-blur-sm rounded-2xl">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-sm font-medium text-destructive">
                    {lockoutMessage}
                  </AlertDescription>
                </Alert>}

              {/* Magic Link Sent Success State */}
              {magicLinkSent && (
                <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 space-y-2" role="status" aria-live="polite">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden />
                    <p className="text-sm font-bold text-green-500">{t('login.magicLink.sentTitle')}</p>
                  </div>
                  <p className="text-xs text-center text-foreground/80">
                    {t('login.magicLink.sentDescription')}
                  </p>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label htmlFor="auth-email-login" className="sr-only">{t('login.email', 'Email')}</label>
                <Input ref={emailInputRef} id="auth-email-login" type="email" autoComplete="email" placeholder={t('login.email', 'Email')} value={email} onChange={e => { setEmail(e.target.value); setMagicLinkSent(false); }} className="h-14 rounded-full px-6 bg-black/20 border-white/[0.08] text-white placeholder:text-white/40 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] focus-visible:bg-black/40 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-white/20 transition-all duration-300" required />
              </div>

              {/* Primary CTA: Send Secure Magic Link */}
              <Button
                type="button"
                variant="outline"
                onClick={handleMagicLink}
                disabled={magicLinkLoading || magicLinkSent}
                aria-busy={magicLinkLoading}
                className="relative w-full h-14 rounded-full gap-3 text-sm font-medium bg-card/25 backdrop-blur-xl border-white/15 hover:bg-card/35 hover:border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_30px_rgba(0,0,0,0.16)] overflow-hidden"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[1.5px] animate-rainbow bg-[linear-gradient(90deg,transparent_0%,hsl(var(--color-1))_10%,hsl(var(--color-5))_30%,hsl(var(--color-3))_50%,hsl(var(--color-4))_70%,hsl(var(--color-2))_90%,transparent_100%)] bg-[length:200%]"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-x-1 -bottom-1 h-3 animate-rainbow bg-[linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))] bg-[length:200%] opacity-95 blur-lg"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-x-2 -bottom-3 h-6 animate-rainbow bg-[linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))] bg-[length:200%] opacity-55 blur-2xl"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute -left-[2px] bottom-0 h-[20%] w-10 animate-rainbow rounded-bl-[18px] rounded-tl-[12px] bg-[radial-gradient(125%_100%_at_100%_100%,hsl(var(--color-1))_0%,hsl(var(--color-5))_40%,transparent_85%)] bg-[length:200%] opacity-80 blur-md"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-[2px] bottom-0 h-[20%] w-10 animate-rainbow rounded-br-[18px] rounded-tr-[12px] bg-[radial-gradient(125%_100%_at_0%_100%,hsl(var(--color-2))_0%,hsl(var(--color-4))_40%,transparent_85%)] bg-[length:200%] opacity-80 blur-md"
                />
                <span className="relative z-10 inline-flex items-center">
                  {magicLinkLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden />{tCommon('actions.loading')}</>
                  ) : magicLinkSent ? (
                    <><Mail className="h-4 w-4 mr-2" aria-hidden />{t('login.magicLink.checkEmail')}</>
                  ) : (
                    <><Wand2 className="h-4 w-4 mr-2" aria-hidden />{t('login.magicLink.send')}</>
                  )}
                </span>
              </Button>

              <div className="flex items-center gap-3 py-2">
                <span className="h-px min-w-0 flex-1 bg-border/50" aria-hidden />
                <span className="shrink-0 text-center text-[11px] font-medium text-muted-foreground">
                  {t('login.magicLink.divider')}
                </span>
                <span className="h-px min-w-0 flex-1 bg-border/50" aria-hidden />
              </div>

              {/* OAuth Buttons: Google & LinkedIn */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-14 rounded-full gap-3 text-[13px] font-medium tracking-wide text-white/90 shadow-[0_2px_10px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.06)] border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] hover:shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-300"
                onClick={handleGoogleAuth}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('oauth.continueWithGoogle')}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-14 rounded-full gap-3 text-[13px] font-medium tracking-wide text-white/90 shadow-[0_2px_10px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.06)] border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] hover:shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-300"
                onClick={handleLinkedInAuth}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden>
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                {t('oauth.continueWithLinkedIn')}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-14 rounded-full gap-3 text-[13px] font-medium tracking-wide text-white/90 shadow-[0_2px_10px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.06)] border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] hover:shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-300"
                onClick={handleAppleAuth}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                  />
                </svg>
                {t('oauth.continueWithApple')}
              </Button>

              {/* Request Access & Set Password */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowAccessDialog(true)}
                  className="text-foreground/90 hover:text-foreground hover:underline text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded"
                >
                  {t('signup.requestAccess', 'Request Access')}
                </button>
              </div>

              <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
                <DialogContent className="backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-center text-lg">{t('signup.requestAccess', 'Request Access')}</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="w-full h-12 text-base gap-2"
                      onClick={() => { setShowAccessDialog(false); navigate('/onboarding'); }}
                    >
                      <Users className="h-5 w-5" />
                      {t('signup.forMembers', 'For Members')}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-12 text-base gap-2"
                      onClick={() => { setShowAccessDialog(false); navigate('/partner'); }}
                    >
                      <Building2 className="h-5 w-5" />
                      {t('signup.forPartners', 'For Capital Partners')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setSetPasswordOpen(true)}
                  className="text-sm text-foreground/50 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded px-1"
                >
                  {t('login.setPassword', 'Want to set a permanent password?')} <span className="underline">{t('login.clickHere', 'Click here')}</span>
                </button>
              </div>
            </div>

            : <form onSubmit={handleEmailAuth} className="space-y-5">
              {/* Sign Up Form (with invite) */}
              <div>
                <label htmlFor="auth-fullname-signup" className="sr-only">{t('signup.fullName', 'Full Name')}</label>
                <Input id="auth-fullname-signup" type="text" autoComplete="name" placeholder={t('signup.fullName', 'Full Name')} value={fullName} onChange={e => setFullName(e.target.value)} className="h-14 rounded-xl px-6 bg-black/20 border-white/[0.08] text-white placeholder:text-white/40 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] focus-visible:bg-black/40 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-white/20 transition-all duration-300" required />
              </div>

              <div>
                <label htmlFor="auth-email-signup" className="sr-only">{t('login.email', 'Email')}</label>
                <Input id="auth-email-signup" type="email" autoComplete="email" placeholder={t('login.email', 'Email')} value={email} onChange={e => setEmail(e.target.value)} className="h-14 rounded-xl px-6 bg-black/20 border-white/[0.08] text-white placeholder:text-white/40 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] focus-visible:bg-black/40 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-white/20 transition-all duration-300" required />
              </div>

              <AssistedPasswordConfirmation password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmPasswordChange={setConfirmPassword} />

              <RainbowButton type="submit" disabled={isLoading || inviteValid !== true} className="w-full h-14 rounded-xl font-semibold text-base">
                {isLoading ? tCommon('actions.loading') : t('signup.createAccount', 'Create Account')}
              </RainbowButton>
            </form>}
          </CardContent>
        </motion.div>
      </Card>

      <motion.nav
        variants={layout === "dialog" ? motionPreset.footer : undefined}
        initial={layout === "dialog" ? "hidden" : undefined}
        animate={layout === "dialog" ? "visible" : undefined}
        exit={layout === "dialog" ? "exit" : undefined}
        className="relative z-10 mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] font-medium tracking-wide text-white/40 uppercase"
        aria-label={t('footerNav.ariaLabel')}
      >
        <Link to="/legal/privacy" className="transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded">
          {t('footerNav.privacyPolicy')}
        </Link>
        <Link to="/legal/terms" className="transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded">
          {t('footerNav.termsOfService')}
        </Link>
        <a
          href={marketingSiteUrl}
          className="transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded"
          rel="noopener noreferrer"
        >
          {t('footerNav.home')}
        </a>
        {layout === 'dialog' ? (
          <button
            type="button"
            onClick={() => onRequestClose?.()}
            className="transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded px-1 -mx-1"
          >
            {t('footerNav.close')}
          </button>
        ) : null}
      </motion.nav>
    </>
  );

  return (
    <>
      {layout === 'page' ? (
        <motion.div
          className="relative z-10 w-full max-w-[624px]"
          initial={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {cardAndNav}
        </motion.div>
      ) : (
        <div className="relative z-10 w-full max-w-[624px] mx-auto">{cardAndNav}</div>
      )}

      {layout === 'page' && (
        <button
          type="button"
          onClick={() => {
            const info = `Build ${typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev'} @ ${typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'local'}`;
            navigator.clipboard?.writeText(info);
          }}
          className="fixed bottom-3 right-3 text-[10px] text-foreground/20 hover:text-foreground/50 transition-colors font-mono z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded px-1"
          title="Click to copy version info"
        >
          v{typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev'}
        </button>
      )}

      <SetPasswordModal open={setPasswordOpen} onOpenChange={setSetPasswordOpen} />
    </>
  );
}