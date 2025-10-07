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
import authBackground from "@/assets/auth-background.gif";
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* GIF Background - Full screen, no black edges */}
      <div className="absolute inset-0">
        <img 
          src={authBackground} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover object-center scale-110"
        />
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
              <div className="absolute inset-0 bg-gradient-accent blur-2xl opacity-40 rounded-full"></div>
              <div className="relative w-24 h-24 rounded-[28px] bg-gradient-accent flex items-center justify-center font-black text-4xl text-white shadow-2xl animate-scale-in">
                QC
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              {isLogin ? "Welcome Back" : "Join The Quantum Club"}
            </h1>
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-semibold tracking-wide">
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
              <p className="text-xs text-muted-foreground">
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
          <form onSubmit={handleEmailAuth} className="space-y-5">
            {!isLogin && (
              <div>
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-14 bg-background/50 border-white/20 rounded-2xl font-medium text-base placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all backdrop-blur-sm"
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
                className="h-14 bg-background/50 border-white/20 rounded-2xl font-medium text-base placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all backdrop-blur-sm"
              />
            </div>

            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-14 bg-background/50 border-white/20 rounded-2xl font-medium text-base placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all backdrop-blur-sm"
              />
              {!isLogin && password && (
                <div className="text-xs space-y-2 mt-4 p-4 rounded-2xl bg-background/30 border border-white/10 backdrop-blur-sm">
                  <p className={password.length >= 12 ? "text-success font-semibold" : "text-muted-foreground/80"}>
                    {password.length >= 12 ? "✓" : "○"} At least 12 characters
                  </p>
                  <p className={/[A-Z]/.test(password) ? "text-success font-semibold" : "text-muted-foreground/80"}>
                    {/[A-Z]/.test(password) ? "✓" : "○"} One uppercase letter
                  </p>
                  <p className={/[a-z]/.test(password) ? "text-success font-semibold" : "text-muted-foreground/80"}>
                    {/[a-z]/.test(password) ? "✓" : "○"} One lowercase letter
                  </p>
                  <p className={/[0-9]/.test(password) ? "text-success font-semibold" : "text-muted-foreground/80"}>
                    {/[0-9]/.test(password) ? "✓" : "○"} One number
                  </p>
                  <p className={/[^A-Za-z0-9]/.test(password) ? "text-success font-semibold" : "text-muted-foreground/80"}>
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
                  className="h-14 bg-background/50 border-white/20 rounded-2xl font-medium text-base placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all backdrop-blur-sm"
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
                <span className="bg-background/50 backdrop-blur-sm px-4 py-1 rounded-full text-muted-foreground/70 font-bold tracking-wider">
                  Coming Soon
                </span>
              </div>
            </div>

            {/* Circular Social Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                className="w-14 h-14 rounded-full bg-background/50 border border-white/20 flex items-center justify-center opacity-40 cursor-not-allowed transition-all hover:bg-background/70 backdrop-blur-sm"
                disabled
              >
                <FaGoogle className="w-5 h-5 text-foreground" />
              </button>

              <button
                type="button"
                className="w-14 h-14 rounded-full bg-background/50 border border-white/20 flex items-center justify-center opacity-40 cursor-not-allowed transition-all hover:bg-background/70 backdrop-blur-sm"
                disabled
              >
                <Apple className="w-6 h-6 text-foreground" />
              </button>

              <button
                type="button"
                className="w-14 h-14 rounded-full bg-background/50 border border-white/20 flex items-center justify-center opacity-40 cursor-not-allowed transition-all hover:bg-background/70 backdrop-blur-sm"
                disabled
              >
                <FaLinkedin className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </form>

          {!inviteCode && (
            <div className="text-center text-sm pt-8 pb-4">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="text-muted-foreground hover:text-foreground font-semibold transition-colors duration-300 underline-offset-4 hover:underline"
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
