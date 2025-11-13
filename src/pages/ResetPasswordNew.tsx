import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AssistedPasswordConfirmation } from "@/components/ui/assisted-password-confirmation";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Lock, AlertCircle } from "lucide-react";
import { validatePasswordStrength } from "@/utils/passwordReset";

export default function ResetPasswordNew() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid reset token");
      navigate('/forgot-password');
    }
  }, [token, navigate]);

  const validation = validatePasswordStrength(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = validation.valid && passwordsMatch && !isLoading;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('password-reset-set-password', {
        body: {
          token,
          new_password: password,
          confirm_password: confirmPassword
        }
      });

      if (error) throw error;

      if (data?.reused) {
        toast.error("Cannot reuse recent passwords. Please choose a different one.", {
          duration: 5000
        });
        return;
      }

      if (data?.success) {
        toast.success("Password changed successfully!");
        setTimeout(() => navigate('/auth'), 2000);
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const requirements = [
    { label: "At least 12 characters", met: password.length >= 12 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
    { label: "One special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background/95 p-4">
      <Card className="w-full max-w-md backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl">
        <CardHeader className="space-y-4 text-center pt-8">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create New Password</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Your password must be different from previously used passwords
            </p>
          </div>
        </CardHeader>

        <CardContent className="pb-8 space-y-6">
          <AssistedPasswordConfirmation
            password={password}
            confirmPassword={confirmPassword}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
          />

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Password Requirements:</p>
            <div className="space-y-2">
              {requirements.map((req, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {req.met ? (
                    <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={req.met ? "text-success" : "text-muted-foreground"}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {password && confirmPassword && !passwordsMatch && (
            <div className="flex items-center gap-2 text-sm text-warning bg-warning/10 border border-warning/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Passwords do not match</span>
            </div>
          )}

          <RainbowButton
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full"
          >
            {isLoading ? "Resetting Password..." : "Reset Password"}
          </RainbowButton>

          <p className="text-xs text-center text-muted-foreground">
            After resetting, you'll be redirected to login with your new password
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
