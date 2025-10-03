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
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-2 border-foreground">
        <CardHeader className="space-y-1 border-b-2 border-foreground pb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-foreground text-background flex items-center justify-center font-black text-xl">
              QC
            </div>
          </div>
          <CardTitle className="text-2xl font-black uppercase text-center tracking-tight">
            {isLogin ? "SIGN IN" : "CREATE ACCOUNT"}
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            {isLogin
              ? "Welcome back to The Quantum Club"
              : "Join The Quantum Club"}
          </p>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Email Auth Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="FULL NAME"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="border-2 border-foreground uppercase font-bold text-xs tracking-wider placeholder:text-muted-foreground"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="EMAIL"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-2 border-foreground uppercase font-bold text-xs tracking-wider placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="PASSWORD"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-2 border-foreground uppercase font-bold text-xs tracking-wider placeholder:text-muted-foreground"
                />
                {!isLogin && password && (
                  <div className="text-xs space-y-1 mt-2">
                    <p className={password.length >= 12 ? "text-green-600" : "text-muted-foreground"}>
                      ✓ At least 12 characters
                    </p>
                    <p className={/[A-Z]/.test(password) ? "text-green-600" : "text-muted-foreground"}>
                      ✓ One uppercase letter
                    </p>
                    <p className={/[a-z]/.test(password) ? "text-green-600" : "text-muted-foreground"}>
                      ✓ One lowercase letter
                    </p>
                    <p className={/[0-9]/.test(password) ? "text-green-600" : "text-muted-foreground"}>
                      ✓ One number
                    </p>
                    <p className={/[^A-Za-z0-9]/.test(password) ? "text-green-600" : "text-muted-foreground"}>
                      ✓ One special character
                    </p>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="CONFIRM PASSWORD"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="border-2 border-foreground uppercase font-bold text-xs tracking-wider placeholder:text-muted-foreground"
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-foreground text-background hover:bg-foreground/90 font-black uppercase text-xs tracking-wider"
                disabled={isLoading || (inviteCode && !isLogin && inviteValid === false)}
              >
                {isLoading ? "LOADING..." : isLogin ? "SIGN IN" : "SIGN UP"}
              </Button>
            </form>

            {!inviteCode && (
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-foreground hover:underline font-bold uppercase text-xs tracking-wider"
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
