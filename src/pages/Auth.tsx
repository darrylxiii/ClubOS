import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

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
  
  const [isLogin, setIsLogin] = useState(!inviteCode); // Start with signup if invite code present
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  // Validate invite code if present
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
      // Validate inputs
      emailSchema.parse(email);
      
      if (!isLogin) {
        // Additional validation for sign up
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
        // Let AuthContext handle navigation to avoid session conflicts
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

        // Process invite code if present
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
        <div className="text-2xl font-black uppercase tracking-tight">LOADING...</div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-glass-mesh flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      <Card className="w-full max-w-md relative z-10 glass-strong animate-bounce-in">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex items-center justify-center mb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center font-black text-2xl text-white shadow-glow">
              QC
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center">
            {isLogin ? "Welcome Back" : "Join The Club"}
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center font-medium">
            {isLogin
              ? "Sign in to continue your journey"
              : "Create your account to get started"}
          </p>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="space-y-4">
            {/* Email Auth Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="glass-subtle border-border/50 h-12 rounded-xl font-medium placeholder:text-muted-foreground/70"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="glass-subtle border-border/50 h-12 rounded-xl font-medium placeholder:text-muted-foreground/70"
                />
              </div>

              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="glass-subtle border-border/50 h-12 rounded-xl font-medium placeholder:text-muted-foreground/70"
                />
                {!isLogin && password && (
                  <div className="text-xs space-y-1.5 mt-3 p-3 rounded-lg glass-subtle">
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
                    className="glass-subtle border-border/50 h-12 rounded-xl font-medium placeholder:text-muted-foreground/70"
                  />
                </div>
              )}

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full font-bold"
                disabled={isLoading || (inviteCode && !isLogin && inviteValid === false)}
              >
                {isLoading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>

            {!inviteCode && (
              <div className="text-center text-sm pt-2">
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
                    ? "Need an account? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
