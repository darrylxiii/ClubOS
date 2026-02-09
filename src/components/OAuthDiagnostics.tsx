import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export const OAuthDiagnostics = () => {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkOAuthConfig();
  }, []);

  const checkOAuthConfig = async () => {
    try {
      // Test OAuth URL generation (doesn't actually redirect)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true
        }
      });

      if (error) {
        setStatus('error');
        setMessage(`Google OAuth is not configured: ${error.message}`);
      } else if (data?.url) {
        setStatus('ok');
        setMessage('Google OAuth is configured correctly');
      } else {
        setStatus('error');
        setMessage('Unable to generate OAuth URL - check backend settings');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(`OAuth check failed: ${error.message}`);
    }
  };

  if (status === 'checking') return null;
  if (status === 'ok') return null; // Only show errors

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {message}
        <br />
        <span className="text-xs">Contact support to enable Google sign-in.</span>
      </AlertDescription>
    </Alert>
  );
};
