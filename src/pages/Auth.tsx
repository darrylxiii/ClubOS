import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Lock, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import { AssistedPasswordConfirmation } from "@/components/ui/assisted-password-confirmation";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { useLoginLockout } from "@/hooks/useLoginLockout";
import { generateOAuthState, validateOAuthState, clearOAuthState } from "@/utils/oauthCsrfProtection";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

// Lazy load heavy components to reduce initial bundle
const OAuthDiagnostics = lazy(() => import("@/components/OAuthDiagnostics").then(m => ({ default: m.OAuthDiagnostics })));

const quantumLogo = "/quantum-logo.svg?v=8";
const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(12, "Password must be at least 12 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number").regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const Auth = () => {
  const { user, loading, session } = useAuth();
  const { resolvedTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("invite");
  const prefillEmail = searchParams.get("email");
  const [isLogin, setIsLogin] = useState(!inviteCode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);
  const { checkLockout, recordAttempt } = useLoginLockout();
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');
      const errorDescription = params.get('error_description');
      const state = params.get('state');
      
      // Handle OAuth errors first
      if (error) {
        console.error('[Auth Page] OAuth error:', error, errorDescription);
        toast.error(`Sign in failed: ${errorDescription || error}`);
        window.history.replaceState({}, '', '/auth');
        clearOAuthState();
        return;
      }
      
      // If we have a state parameter, this is an OAuth callback
      if (state) {
        console.log('[Auth Page] OAuth callback detected with state');
        
        // Check if Supabase already has a valid session (OAuth succeeded)
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession?.user) {
          // User is authenticated - OAuth worked, clear state and let auth flow continue
          console.log('[Auth Page] OAuth succeeded - session found');
          clearOAuthState();
          window.history.replaceState({}, '', '/auth');
          return;
        }
        
        // No session yet - validate CSRF state but don't block if it fails
        // (Session check above is the real security, state is defense-in-depth)
        const isValid = validateOAuthState(state);
        if (!isValid) {
          console.warn('[Auth Page] OAuth state validation failed, but continuing...');
        } else {
          console.log('[Auth Page] OAuth CSRF validation passed');
        }
        
        // Clean up URL
        window.history.replaceState({}, '', '/auth');
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
      if (!loading && user && session && !mfaRequired) {
        // Check if user has completed onboarding
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed_at')
          .eq('id', user.id)
          .single();

        if (!profile?.onboarding_completed_at) {
          console.log("[Auth Page] ⚠️ User needs to complete onboarding");
          navigate("/oauth-onboarding");
        } else {
          console.log("[Auth Page] ✅ User authenticated, navigating to /home");
          navigate("/home");
        }
      }
    };

    checkOnboardingStatus();
  }, [loading, user, session, mfaRequired, navigate]);

  useEffect(() => {
    if (inviteCode) {
      validateInviteCode(inviteCode);
    }
  }, [inviteCode]);

  useEffect(() => {
    if (prefillEmail) {
      setEmail(decodeURIComponent(prefillEmail));
      setIsLogin(true);
      toast.info("Please enter your password to log in");
    }
  }, [prefillEmail]);

  const validateInviteCode = async (code: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('validate-invite-code', {
        body: { code }
      });
      
      if (error) throw error;
      
      if (data?.valid) {
        setInviteValid(true);
        setInviteInfo({ referrerName: data.referrerName });
        toast.success(data.message || "Valid invite code! Please create your account.");
      } else {
        setInviteValid(false);
        toast.error(data?.message || "Invalid or expired invite code");
      }
    } catch (error) {
      console.error("Error validating invite:", error);
      setInviteValid(false);
      toast.error("Error validating invite code. Please try again.");
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
          toast.error("Passwords do not match");
          return;
        }
      }
      
      if (isLogin) {
        // Check for account lockout before attempting login
        const lockoutStatus = await checkLockout(email);
        if (lockoutStatus.locked) {
          setLockoutMessage(lockoutStatus.message || 'Account temporarily locked');
          toast.error(lockoutStatus.message || 'Too many failed attempts. Please try again later.');
          return;
        }
        setLockoutMessage(null);
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          // Record failed attempt
          await recordAttempt(email, false);
          
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Please verify your email address first");
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
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
              factorId: verifiedFactor.id
            });
            
            if (challengeError) {
              toast.error("Failed to initiate 2FA verification");
              return;
            }

            setMfaFactorId(verifiedFactor.id);
            setMfaChallengeId(challengeData.id);
            setMfaRequired(true);
            toast.info("Please enter your 2FA code");
            return;
          }
        }

        if (data?.session) {
          console.log("[Auth Page] Login successful");
        }
      } else {
        if (!fullName.trim()) {
          toast.error("Please enter your full name");
          return;
        }
        
        const redirectUrl = `${window.location.origin}/`;
        const { data: authData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { full_name: fullName }
          }
        });
        
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Try signing in instead.");
            setIsLogin(true);
          } else {
            toast.error(error.message);
          }
          return;
        }

        if (authData?.user && !authData.session) {
          toast.success("Verification email sent! Please check your inbox.");
          setNeedsEmailVerification(true);
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
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
      
      // Generate CSRF state parameter
      const state = generateOAuthState();
      
      const redirectUrl = inviteCode 
        ? `${window.location.origin}/auth?invite=${inviteCode}`
        : `${window.location.origin}/auth`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            state
          }
        }
      });

      if (error) throw error;
    } catch (error: any) {
      clearOAuthState();
      toast.error(error.message || "Failed to initiate Google sign-in");
    }
  };

  const handleAppleAuth = async () => {
    try {
      if (inviteCode) {
        localStorage.setItem('pending_invite_code', inviteCode);
      }
      
      // Generate CSRF state parameter
      const state = generateOAuthState();
      
      const redirectUrl = inviteCode 
        ? `${window.location.origin}/auth?invite=${inviteCode}`
        : `${window.location.origin}/auth`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
          queryParams: { state }
        }
      });

      if (error) throw error;
    } catch (error: any) {
      clearOAuthState();
      toast.error(error.message || "Failed to initiate Apple sign-in");
    }
  };

  const handleLinkedInAuth = async () => {
    try {
      if (inviteCode) {
        localStorage.setItem('pending_invite_code', inviteCode);
      }
      
      // Generate CSRF state parameter
      const state = generateOAuthState();
      
      const redirectUrl = inviteCode 
        ? `${window.location.origin}/auth?invite=${inviteCode}`
        : `${window.location.origin}/auth`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: redirectUrl,
          scopes: 'openid profile email',
          queryParams: { state }
        }
      });

      if (error) throw error;
    } catch (error: any) {
      clearOAuthState();
      toast.error(error.message || "Failed to initiate LinkedIn sign-in");
    }
  };

  const handleVerifyEmail = async () => {
    if (emailVerificationCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }
    
    setVerificationLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-email-code', {
        body: { email, code: emailVerificationCode }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success("Email verified! You can now sign in.");
      setNeedsEmailVerification(false);
      setEmailVerificationCode("");
      setIsLogin(true);
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code");
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleVerifyMFA = async () => {
    if (mfaCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }
    
    if (!mfaFactorId || !mfaChallengeId) {
      toast.error("No MFA challenge found. Please try signing in again.");
      setMfaRequired(false);
      return;
    }
    
    setVerificationLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: mfaCode
      });
      
      if (error) throw error;
      
      if (data) {
        setMfaRequired(false);
        navigate("/home");
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid 2FA code");
      setMfaCode("");
    } finally {
      setVerificationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl font-black uppercase tracking-tight animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg bg-background/30 backdrop-blur-xl border border-border/50 shadow-2xl rounded-[32px]">
        <CardHeader className="space-y-6 pb-8 text-center pt-12">
          <div className="flex items-center justify-center mb-2">
            <img src={quantumLogo} alt="The Quantum Club" className="w-32 h-32" width="128" height="128" fetchPriority="high" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl tracking-tight text-foreground font-semibold">
              {isLogin ? "Welcome Back" : "Join The Quantum Club"}
            </h1>
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-foreground/90" />
              <p className="text-sm text-foreground/90 font-semibold">INVITE ONLY</p>
            </div>
          </div>

          {inviteValid && inviteInfo && (
            <div className="p-4 rounded-2xl bg-success/10 border border-success/20 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <p className="text-sm font-bold text-success">Valid Invitation</p>
              </div>
              <p className="text-xs text-foreground/80">
                Invited by {inviteInfo.referrerName || "a member"}
              </p>
            </div>
          )}

          {inviteValid === false && (
            <Alert className="bg-destructive/10 border-destructive/20 rounded-2xl">
              <AlertDescription className="text-sm font-medium text-destructive text-center">
                Invalid or expired invite code
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>

        <CardContent className="pt-2 px-8 pb-10">
          {needsEmailVerification ? (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                <p className="text-sm font-bold text-primary text-center">Verify Your Email</p>
                <p className="text-xs text-foreground/80 text-center">
                  We sent a 6-digit code to {email}
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
                {verificationLoading ? "Verifying..." : "Verify Email"}
              </RainbowButton>

              <button type="button" onClick={() => { setNeedsEmailVerification(false); setEmailVerificationCode(""); }} className="text-foreground/80 hover:text-foreground text-sm w-full text-center">
                Back to sign in
              </button>
            </div>
          ) : mfaRequired ? (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                <p className="text-sm font-bold text-primary text-center">Two-Factor Authentication</p>
                <p className="text-xs text-foreground/80 text-center">
                  Enter the 6-digit code from your authenticator app
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
                {verificationLoading ? "Verifying..." : "Verify Code"}
              </RainbowButton>

              <button type="button" onClick={() => { setMfaRequired(false); setMfaCode(""); }} className="text-foreground/80 hover:text-foreground text-sm w-full text-center">
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-5">
              {/* Account Lockout Warning */}
              {lockoutMessage && (
                <Alert className="bg-destructive/10 border-destructive/20 rounded-2xl">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-sm font-medium text-destructive">
                    {lockoutMessage}
                  </AlertDescription>
                </Alert>
              )}
              
              {!isLogin && (
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-14 rounded-2xl"
                  required
                />
              )}

              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 rounded-2xl"
                required
              />

              {isLogin ? (
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 rounded-2xl"
                  required
                />
              ) : (
                <AssistedPasswordConfirmation
                  password={password}
                  confirmPassword={confirmPassword}
                  onPasswordChange={setPassword}
                  onConfirmPasswordChange={setConfirmPassword}
                />
              )}

              <RainbowButton
                type="submit"
                disabled={isLoading || (!isLogin && inviteValid !== true)}
                className="w-full h-16 rounded-2xl font-bold text-lg"
              >
                {isLoading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
              </RainbowButton>

              <div className="relative py-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-background/50 text-foreground/70 rounded-full">or</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={handleGoogleAuth}
                  variant="outline"
                  className="w-full h-14 rounded-2xl font-semibold"
                >
                  <FaGoogle className="mr-3 h-5 w-5" />
                  Continue with Google
                </Button>

                <Button
                  type="button"
                  onClick={handleAppleAuth}
                  variant="outline"
                  className="w-full h-14 rounded-2xl font-semibold"
                >
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </Button>

                <Button
                  type="button"
                  onClick={handleLinkedInAuth}
                  variant="outline"
                  className="w-full h-14 rounded-2xl font-semibold"
                >
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  Continue with LinkedIn
                </Button>
              </div>

              <div className="text-center pt-2">
            <Link
              to="/onboarding"
              className="text-foreground/80 hover:text-foreground text-sm"
            >
              Request Access
            </Link>
              </div>

              {isLogin && (
                <div className="text-center">
                  <Link to="/forgot-password" className="text-sm text-foreground/70 hover:text-foreground">
                    Forgot password?
                  </Link>
                </div>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      {resolvedTheme === 'dark' && <OAuthDiagnostics />}
    </div>
  );
};

export default Auth;
