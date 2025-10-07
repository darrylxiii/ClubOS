import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Lock, Sparkles, Shield, CheckCircle2, Apple } from "lucide-react";
import { FaGoogle, FaLinkedin } from "react-icons/fa";
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
  const { user, loading } = useAuth();
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
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/home");
    }
  }, [user, loading, navigate]);

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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password");
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success("Welcome back!");
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

        toast.success("Account created! You can now sign in.");
        setIsLogin(true);
        setPassword("");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl font-black uppercase tracking-tight animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Floating orbs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-primary/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "3s" }} />
      </div>

      <Card className="w-full max-w-md relative z-10 glass-strong border-0 shadow-glass-xl animate-fade-in">
        <CardHeader className="space-y-4 pb-6 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-accent flex items-center justify-center font-black text-3xl text-white shadow-glow animate-scale-in">
                QC
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-success rounded-full flex items-center justify-center shadow-glass-md">
                <Shield className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              {isLogin ? "Welcome Back" : "Join The Quantum Club"}
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              {isLogin
                ? "Sign in to your exclusive account"
                : "Create your invite-only account"}
            </p>
          </div>

          {/* Invite-only badge */}
          {!isLogin && !inviteCode && (
            <Alert className="glass-subtle border-primary/30">
              <Lock className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm font-medium">
                <span className="text-primary font-semibold">Invite Only:</span> The Quantum Club is an exclusive platform. Please request an invitation from an existing member.
              </AlertDescription>
            </Alert>
          )}

          {/* Valid invite indicator */}
          {inviteValid && inviteInfo && (
            <div className="p-4 rounded-xl glass-subtle space-y-2 text-left">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <p className="text-sm font-semibold text-foreground">Valid Invitation</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Invited by {inviteInfo.profiles?.full_name || "a member"}
              </p>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-2">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="glass-subtle border-border/30 h-12 rounded-xl font-medium"
                />
              </div>
            )}

            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass-subtle border-border/30 h-12 rounded-xl font-medium"
              />
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="glass-subtle border-border/30 h-12 rounded-xl font-medium"
              />
              {!isLogin && password && (
                <div className="text-xs space-y-1.5 mt-3 p-4 rounded-xl glass-subtle">
                  <p className={password.length >= 12 ? "text-success font-semibold" : "text-muted-foreground"}>
                    {password.length >= 12 ? "✓" : "○"} At least 12 characters
                  </p>
                  <p className={/[A-Z]/.test(password) ? "text-success font-semibold" : "text-muted-foreground"}>
                    {/[A-Z]/.test(password) ? "✓" : "○"} One uppercase letter
                  </p>
                  <p className={/[a-z]/.test(password) ? "text-success font-semibold" : "text-muted-foreground"}>
                    {/[a-z]/.test(password) ? "✓" : "○"} One lowercase letter
                  </p>
                  <p className={/[0-9]/.test(password) ? "text-success font-semibold" : "text-muted-foreground"}>
                    {/[0-9]/.test(password) ? "✓" : "○"} One number
                  </p>
                  <p className={/[^A-Za-z0-9]/.test(password) ? "text-success font-semibold" : "text-muted-foreground"}>
                    {/[^A-Za-z0-9]/.test(password) ? "✓" : "○"} One special character
                  </p>
                </div>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="glass-subtle border-border/30 h-12 rounded-xl font-medium"
                />
              </div>
            )}

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full font-bold mt-6"
              disabled={isLoading || (inviteCode && !isLogin && inviteValid === false)}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading...
                </span>
              ) : isLogin ? (
                "Sign In"
              ) : (
                <>
                  Create Account
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </Button>

            {/* Social Login Section */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground font-semibold">Coming Soon</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                variant="glass"
                size="lg"
                className="w-full font-semibold opacity-50 cursor-not-allowed"
                disabled
              >
                <FaGoogle className="w-5 h-5" />
                Continue with Google
              </Button>

              <Button
                type="button"
                variant="glass"
                size="lg"
                className="w-full font-semibold opacity-50 cursor-not-allowed"
                disabled
              >
                <Apple className="w-5 h-5" />
                Continue with Apple
              </Button>

              <Button
                type="button"
                variant="glass"
                size="lg"
                className="w-full font-semibold opacity-50 cursor-not-allowed"
                disabled
              >
                <FaLinkedin className="w-5 h-5" />
                Continue with LinkedIn
              </Button>
            </div>
          </form>

          {!inviteCode && (
            <div className="text-center text-sm pt-6">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="text-foreground hover:text-primary font-semibold transition-colors duration-200"
              >
                {isLogin
                  ? "Need an account? Request invite"
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
