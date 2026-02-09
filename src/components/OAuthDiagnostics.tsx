import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable/index";
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
      // Test OAuth via managed auth
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if ((result as any)?.error) {
        setStatus('error');
        setMessage(`Google OAuth is not configured: ${(result as any).error.message}`);
      } else {
        setStatus('ok');
        setMessage('Google OAuth is configured correctly (managed auth)');
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
