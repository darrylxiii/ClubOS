import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export const OAuthDiagnostics = () => {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // OAuth is now managed by Lovable Cloud - no client-side check needed
    setStatus('ok');
    setMessage('Google OAuth is managed by Lovable Cloud');
  }, []);

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
