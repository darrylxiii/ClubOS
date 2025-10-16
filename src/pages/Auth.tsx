import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Lock, Sparkles, Shield, CheckCircle2 } from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const Auth = () => {
  const { user, loading, session } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("invite");
  
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
  const navigate = useNavigate();

  useEffect(() => {
    console.log("[Auth Page] State:", { loading, user: !!user, mfaRequired, session: !!session });
    
    // Only redirect for non-MFA scenarios (regular login completed or OAuth without MFA)
    if (!loading && user && session && !mfaRequired) {
      console.log("[Auth Page] User fully authenticated, redirecting to home");
      setTimeout(() => {
        navigate("/home", { replace: true });
      }, 150);
    }
  }, [user, loading, navigate, mfaRequired, session]);

  useEffect(() => {
    if (inviteCode) {
      validateInviteCode(inviteCode);
    }
  }, [inviteCode]);

  const validateInviteCode = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from("invite_codes")
        .select("*, profiles!invite_codes_created_by_fkey(full_name)")
        .eq("code", code)
        .eq("is_active", true)
        .is("used_by", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !data) {
        setInviteValid(false);
        toast.error("Invalid or expired invite code");
        return;
      }

      setInviteValid(true);
      setInviteInfo(data);
      toast.success("Valid invite code! Please create your account.");
    } catch (error) {
      console.error("Error validating invite:", error);
      setInviteValid(false);
    }
  };

  // Listen for MFA completion from OAuth flows
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log("[Auth Page] Auth state change:", event, "Has session?", !!currentSession);
      
      // When OAuth is successful with session, redirect
      if ((event === 'SIGNED_IN' || event === 'MFA_CHALLENGE_VERIFIED') && currentSession) {
        console.log("[Auth Page] OAuth/MFA completed, redirecting to home");
        setTimeout(() => {
          navigate("/home", { replace: true });
        }, 100);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

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
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
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

        // Check if MFA is required
        const factors = data.user?.factors || [];
        if (factors.length > 0 && factors.some(f => f.status === 'verified')) {
          setMfaRequired(true);
          toast.info("Please enter your 2FA code");
          return;
        }

        if (data?.session) {
          toast.success("Welcome back!");
          navigate("/home");
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
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please sign in instead.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        if (inviteCode && inviteValid && authData.user) {
          try {
            const { data: result, error: inviteError } = await supabase.rpc(
              "use_invite_code",
              {
                _code: inviteCode,
                _user_id: authData.user.id,
              }
            );

            if (inviteError) {
              console.error("Error processing invite:", inviteError);
              toast.error("Account created but invite code processing failed");
            } else if (result && typeof result === 'object' && 'success' in result && result.success) {
              toast.success("Account created with referral link!");
            }
          } catch (inviteError) {
            console.error("Error using invite:", inviteError);
          }
        }

        toast.success("Account created! Please verify your email.");
        setNeedsEmailVerification(true);
        
        // Send verification code
        const { error: verifyError } = await supabase.functions.invoke('send-email-verification', {
          body: { email }
        });
        
        if (verifyError) {
          console.error("Failed to send verification:", verifyError);
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
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

    setVerificationLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const factor = user.factors?.find(f => f.status === 'verified');
      if (!factor) throw new Error("No verified MFA factor found");

      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: mfaCode
      });

      if (error) throw error;

      if (data) {
        toast.success("Welcome back!");
        navigate("/home");
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid 2FA code");
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-background/20" />
      </div>

      {/* Floating ambient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      <Card className="w-full max-w-lg relative z-10 bg-background/30 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[32px] animate-fade-in overflow-hidden">
        <CardHeader className="space-y-6 pb-8 text-center pt-12">
          {/* Logo with glow */}
          <div className="flex items-center justify-center mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-accent blur-2xl opacity-30 rounded-full"></div>
              <img 
                src="/quantum-logo.svg" 
                alt="The Quantum Club" 
                className="relative w-32 h-32 drop-shadow-2xl"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white">
              {isLogin ? "Welcome Back" : "Join The Quantum Club"}
            </h1>
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-white/90" />
              <p className="text-sm text-white/90 font-semibold tracking-wide">
                INVITE ONLY • GEBRUIK JE PERSOONLIJKE CODE
              </p>
            </div>
          </div>

          {/* Valid invite indicator */}
          {inviteValid && inviteInfo && (
            <div className="p-4 rounded-2xl bg-success/10 border border-success/20 backdrop-blur-sm space-y-2">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <p className="text-sm font-bold text-success">Valid Invitation</p>
              </div>
              <p className="text-xs text-white/80">
                Invited by {inviteInfo.profiles?.full_name || "a member"}
              </p>
            </div>
          )}

          {inviteValid === false && (
            <Alert className="bg-destructive/10 border-destructive/20 backdrop-blur-sm rounded-2xl">
              <AlertDescription className="text-sm font-medium text-destructive text-center">
                Invalid or expired invite code
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>

        <CardContent className="pt-2 px-8 pb-10">
          {needsEmailVerification ? (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-sm space-y-2">
                <p className="text-sm font-bold text-primary text-center">Verify Your Email</p>
                <p className="text-xs text-white/80 text-center">
                  We sent a 6-digit code to {email}
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={emailVerificationCode}
                  onChange={setEmailVerificationCode}
                  disabled={verificationLoading}
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

              <Button
                onClick={handleVerifyEmail}
                disabled={emailVerificationCode.length !== 6 || verificationLoading}
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-primary/90 to-accent/90 hover:from-primary hover:to-accent text-white font-bold text-lg shadow-2xl shadow-primary/20 transition-all duration-300 hover:scale-[1.02]"
              >
                {verificationLoading ? "Verifying..." : "Verify Email"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setNeedsEmailVerification(false);
                  setEmailVerificationCode("");
                }}
                className="text-white/80 hover:text-white font-semibold transition-colors duration-300 underline-offset-4 hover:underline text-sm w-full text-center"
              >
                Back to sign in
              </button>
            </div>
          ) : mfaRequired ? (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-sm space-y-2">
                <p className="text-sm font-bold text-primary text-center">Two-Factor Authentication</p>
                <p className="text-xs text-white/80 text-center">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={mfaCode}
                  onChange={setMfaCode}
                  disabled={verificationLoading}
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

              <Button
                onClick={handleVerifyMFA}
                disabled={mfaCode.length !== 6 || verificationLoading}
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-primary/90 to-accent/90 hover:from-primary hover:to-accent text-white font-bold text-lg shadow-2xl shadow-primary/20 transition-all duration-300 hover:scale-[1.02]"
              >
                {verificationLoading ? "Verifying..." : "Verify 2FA Code"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setMfaRequired(false);
                  setMfaCode("");
                }}
                className="text-white/80 hover:text-white font-semibold transition-colors duration-300 underline-offset-4 hover:underline text-sm w-full text-center"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-5">
            {!isLogin && (
              <div>
              <Input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-14 bg-card/80 backdrop-blur-sm border-white/20 rounded-2xl font-semibold text-base placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
              </div>
            )}

            <div>
              <Input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 bg-card/80 backdrop-blur-sm border-white/20 rounded-2xl font-semibold text-base placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-14 bg-card/80 backdrop-blur-sm border-white/20 rounded-2xl font-semibold text-base placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {!isLogin && password && (
                <div className="text-xs space-y-2 mt-4 p-4 rounded-2xl bg-background/30 border border-white/10 backdrop-blur-sm">
                  <p className={password.length >= 12 ? "text-success font-semibold" : "text-white/70"}>
                    {password.length >= 12 ? "✓" : "○"} At least 12 characters
                  </p>
                  <p className={/[A-Z]/.test(password) ? "text-success font-semibold" : "text-white/70"}>
                    {/[A-Z]/.test(password) ? "✓" : "○"} One uppercase letter
                  </p>
                  <p className={/[a-z]/.test(password) ? "text-success font-semibold" : "text-white/70"}>
                    {/[a-z]/.test(password) ? "✓" : "○"} One lowercase letter
                  </p>
                  <p className={/[0-9]/.test(password) ? "text-success font-semibold" : "text-white/70"}>
                    {/[0-9]/.test(password) ? "✓" : "○"} One number
                  </p>
                  <p className={/[^A-Za-z0-9]/.test(password) ? "text-success font-semibold" : "text-white/70"}>
                    {/[^A-Za-z0-9]/.test(password) ? "✓" : "○"} One special character
                  </p>
                </div>
              )}
            </div>

            {!isLogin && (
              <div>
                <Input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-14 bg-card/80 backdrop-blur-sm border-white/20 rounded-2xl font-semibold text-base placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            )}

            {/* Main CTA Button */}
            <Button
              type="submit"
              className="w-full h-16 rounded-2xl bg-gradient-to-r from-primary/90 to-accent/90 hover:from-primary hover:to-accent text-white font-bold text-lg shadow-2xl shadow-primary/20 mt-8 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={isLoading || (inviteCode && !isLogin && inviteValid === false)}
            >
              {isLoading ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading...
                </span>
              ) : isLogin ? (
                "Sign In"
              ) : (
                <span className="flex items-center gap-2">
                  Get Started
                  <Sparkles className="w-5 h-5" />
                </span>
              )}
            </Button>

            {/* Social Login Section */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background/50 backdrop-blur-sm px-4 py-1 rounded-full text-white/70 font-semibold tracking-wider">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign-in Button */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={async () => {
                  console.log('[OAuth] Starting Google sign in...');
                  try {
                    const { data, error } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: `${window.location.origin}/auth`,
                        queryParams: {
                          access_type: 'offline',
                          prompt: 'consent',
                        }
                      }
                    });
                    console.log('[OAuth] Google response:', { data, error });
                    if (error) {
                      console.error('[OAuth] Google error:', error);
                      throw error;
                    }
                    console.log('[OAuth] Redirecting to Google...');
                  } catch (error: any) {
                    console.error('[OAuth] Caught error:', error);
                    toast.error(error.message || 'Failed to sign in with Google');
                  }
                }}
                className="w-14 h-14 rounded-full bg-background/50 border border-white/20 flex items-center justify-center transition-all hover:bg-background/70 backdrop-blur-sm hover:scale-105 hover:border-primary/50"
              >
                <FaGoogle className="w-5 h-5 text-foreground" />
              </button>
            </div>
            </form>
          )}

          {!inviteCode && !needsEmailVerification && !mfaRequired && (
            <div className="text-center text-sm pt-8 pb-4">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="text-white/80 hover:text-white font-semibold transition-colors duration-300 underline-offset-4 hover:underline"
              >
                {isLogin
                  ? "Click here to request Club Membership"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
