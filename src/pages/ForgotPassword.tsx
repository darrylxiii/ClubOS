import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, ArrowLeft, Mail } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Invalid email address");

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
    } catch {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      const requestPromise = supabase.functions.invoke('password-reset-request', {
        body: { email }
      });

      const { data, error } = await Promise.race([requestPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.rate_limited) {
        toast.error(data.message || "Too many requests. Please try again in 15 minutes.");
        setIsLoading(false);
        return;
      }

      // Always show success (security best practice)
      setSent(true);
      toast.success("If an account exists, you'll receive reset instructions", {
        description: "Check your email inbox and spam folder"
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      if (error.message?.includes('timeout')) {
        toast.error("Request timed out. Please try again.");
      } else if (error.message?.includes('rate limit')) {
        toast.error("Too many requests. Please try again in 15 minutes.");
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        toast.error("Network error. Please check your connection and try again.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background/95 p-4">
      <Card className="w-full max-w-md backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl">
        <CardHeader className="space-y-4 text-center pt-8">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reset Your Password</h1>
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
                <h3 className="font-semibold text-foreground mb-2">Check your email</h3>
                <p className="text-sm text-muted-foreground">
                  We've sent password reset instructions to <span className="text-foreground font-medium">{email}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Didn't receive it? Check your spam folder
                </p>
              </div>
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
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
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
