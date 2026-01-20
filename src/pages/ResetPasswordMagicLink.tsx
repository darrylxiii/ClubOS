import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, XCircle } from "lucide-react";

export default function ResetPasswordMagicLink() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setError("Invalid reset link");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('password-reset-validate-token', {
        body: { token }
      });

      if (error) {
        console.error('Token validation error:', error);
        setError("This reset link has expired or is invalid");
        return;
      }

      if (!data?.valid) {
        setError("This reset link has expired or is invalid");
        return;
      }

      // Valid token - redirect to set password page
      navigate(`/reset-password/new?token=${token}`, { replace: true });
    } catch (err) {
      console.error('Unexpected error:', err);
      setError("Something went wrong");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background/95 p-4">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-destructive/20 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Invalid Reset Link</h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => navigate('/forgot-password')}>
            Request New Link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background/95">
      <div className="flex items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-foreground">Verifying reset link...</p>
      </div>
    </div>
  );
}
