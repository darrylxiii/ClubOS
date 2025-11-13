import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, ArrowLeft, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ResetPasswordVerify() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const navigate = useNavigate();
  
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!email) {
      toast.error("Email is required");
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          toast.error("Code expired. Please request a new one.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('password-reset-validate-otp', {
        body: { email, otp_code: otp }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Code verified!");
        navigate(`/reset-password/new?token=${data.reset_token}`);
      } else {
        const remaining = data?.attempts_remaining || attemptsRemaining - 1;
        setAttemptsRemaining(remaining);
        
        if (remaining === 0) {
          toast.error("Too many failed attempts. Please request a new code.");
        } else {
          toast.error(`Invalid code. ${remaining} attempts remaining.`);
        }
        setOtp("");
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast.error(error.message || "Verification failed");
      setOtp("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('password-reset-request', {
        body: { email }
      });

      if (error) throw error;

      if (data?.rate_limited) {
        toast.error(data.message || "Too many requests. Please try again later.");
        return;
      }

      toast.success("New code sent to your email");
      setResendCooldown(60); // 60 second cooldown
      setTimeRemaining(600); // Reset to 10 minutes
      setAttemptsRemaining(5);
      setOtp("");
    } catch (error: any) {
      console.error('Resend error:', error);
      toast.error("Failed to resend code");
    } finally {
      setIsResending(false);
    }
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && !isVerifying) {
      handleVerify();
    }
  }, [otp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background/95 p-4">
      <Card className="w-full max-w-md backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl">
        <CardHeader className="space-y-4 text-center pt-8">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Enter Verification Code</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Enter the 6-digit code sent to
            </p>
            <p className="text-foreground font-medium text-sm">{email}</p>
          </div>
        </CardHeader>
        <CardContent className="pb-8 space-y-6">
          <div className="flex justify-center">
            <InputOTP
              value={otp}
              onChange={setOtp}
              maxLength={6}
              disabled={isVerifying || attemptsRemaining === 0 || timeRemaining === 0}
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {timeRemaining > 0 ? (
            <p className="text-sm text-center text-muted-foreground">
              Code expires in <span className="text-foreground font-medium">{formatTime(timeRemaining)}</span>
            </p>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span>Code expired</span>
            </div>
          )}

          {attemptsRemaining < 5 && attemptsRemaining > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-warning">
              <AlertCircle className="w-4 h-4" />
              <span>{attemptsRemaining} attempts remaining</span>
            </div>
          )}

          {attemptsRemaining === 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span>Too many failed attempts</span>
            </div>
          )}

          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0 || attemptsRemaining === 0}
              className="w-full"
            >
              {isResending ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
            </Button>
          </div>

          <div className="text-center">
            <Link 
              to="/forgot-password" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back to Password Reset
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
