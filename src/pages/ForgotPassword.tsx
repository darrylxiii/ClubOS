import { useTranslation } from 'react-i18next';
import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, ArrowLeft, Mail } from "lucide-react";
import { z } from "zod";
import { parseEdgeFunctionError } from "@/utils/edgeFunctionErrors";
import { getDeviceFingerprint } from "@/utils/deviceFingerprint";
import { RECAPTCHA_ENABLED, RECAPTCHA_SITE_KEY } from "@/config/recaptcha";
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3";

const emailSchema = z.string().email("Invalid email address");

function ForgotPasswordForm() {
  const { t } = useTranslation('common');
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
    } catch {
      toast.error(t("please_enter_a_valid", "Please enter a valid email address"));
      return;
    }

    setIsLoading(true);

    try {
      // Get reCAPTCHA token
      let recaptchaToken: string | undefined;
      if (RECAPTCHA_ENABLED && executeRecaptcha) {
        try {
          recaptchaToken = await executeRecaptcha('password_reset');
        } catch (err) {
          console.warn('reCAPTCHA execution failed, proceeding without:', err);
        }
      }

      // Get device fingerprint
      let deviceFingerprint: string | undefined;
      try {
        deviceFingerprint = await getDeviceFingerprint();
      } catch (err) {
        console.warn('Device fingerprint generation failed:', err);
      }

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      const requestPromise = supabase.functions.invoke('password-reset-request', {
        body: { email, recaptchaToken, deviceFingerprint }
      });

      const { data, error } = await Promise.race([requestPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Edge function error:', error);
        const body = await parseEdgeFunctionError(error);
        if (body?.rate_limited) {
          toast.error(body.message || "Too many requests. Please try again in 15 minutes.");
          setIsLoading(false);
          return;
        }
        throw error;
      }

      if (data?.rate_limited) {
        toast.error(data.message || "Too many requests. Please try again in 15 minutes.");
        setIsLoading(false);
        return;
      }

      setSent(true);
      toast.success(t("if_an_account_exists", "If an account exists, you'll receive reset instructions"), {
        description: "Check your email inbox and spam folder"
      });
    } catch (error: unknown) {
      console.error('Password reset error:', error);
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('timeout')) {
        toast.error(t("request_timed_out_please", "Request timed out. Please try again."));
      } else if (msg.includes('rate limit')) {
        toast.error(t("too_many_requests_please", "Too many requests. Please try again in 15 minutes."));
      } else if (msg.includes('network') || msg.includes('fetch')) {
        toast.error(t("network_error_please_check", "Network error. Please check your connection and try again."));
      } else {
        toast.error(t("something_went_wrong_please", "Something went wrong. Please try again."));
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, executeRecaptcha]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background/95 p-4">
      <Card className="w-full max-w-md backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl">
        <CardHeader className="space-y-4 text-center pt-8">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("reset_your_password", "Reset Your Password")}</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Enter your email and we'll send you reset instructions
            </p>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          {sent ? (
            <div className="text-center space-y-6 animate-in fade-in duration-500">
              <div className="w-16 h-16 mx-auto bg-success/20 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t("check_your_email", "Check your email")}</h3>
                <p className="text-sm text-muted-foreground">
                  We've sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  We also sent a magic link you can click directly from your email
                </p>
              </div>
              <RainbowButton
                className="w-full"
                onClick={() => navigate(`/reset-password/verify?email=${encodeURIComponent(email)}`)}
              >
                Enter Code
              </RainbowButton>
              <Button 
                variant="outline" 
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t("email_address", "Email Address")}</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("youremailcom", "your@email.com")}
                  disabled={isLoading}
                  autoFocus
                  className="bg-background/50"
                />
              </div>
              
              <RainbowButton
                type="submit"
                className="w-full"
                disabled={isLoading || !email}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </RainbowButton>

              <div className="text-center">
                <Link 
                  to="/auth" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ForgotPassword() {
  if (RECAPTCHA_ENABLED) {
    return (
      <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
        <ForgotPasswordForm />
      </GoogleReCaptchaProvider>
    );
  }

  return <ForgotPasswordForm />;
}
