import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";

export const AuthDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const results: any = {
        timestamp: new Date().toISOString(),
        environment: {
          origin: window.location.origin,
          hostname: window.location.hostname,
          protocol: window.location.protocol,
        },
        supabase: {
          url: import.meta.env.VITE_SUPABASE_URL,
          hasAnonKey: !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        session: null,
        user: null,
        error: null,
      };

      // Check current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        results.error = sessionError.message;
      } else {
        results.session = {
          exists: !!sessionData.session,
          userId: sessionData.session?.user?.id,
          email: sessionData.session?.user?.email,
          provider: sessionData.session?.user?.app_metadata?.provider,
          identities: sessionData.session?.user?.identities?.map(i => ({
            provider: i.provider,
            created_at: i.created_at,
          })),
        };
      }

      // Check user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        results.error = userError.message;
      } else {
        results.user = {
          exists: !!userData.user,
          id: userData.user?.id,
          email: userData.user?.email,
          emailVerified: userData.user?.email_confirmed_at,
          identitiesCount: userData.user?.identities?.length || 0,
        };
      }

      // Test Google OAuth URL generation
      try {
        const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth`,
            skipBrowserRedirect: true,
          }
        });
        
        results.oauth = {
          googleUrl: oauthData?.url,
          error: oauthError?.message,
        };
      } catch (e: any) {
        results.oauth = {
          error: e.message,
        };
      }

      setDiagnostics(results);
    } catch (error: any) {
      toast.error(`Diagnostics failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (diagnostics) {
      navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      toast.success("Diagnostics copied to clipboard");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Auth Diagnostics
        </CardTitle>
        <CardDescription>
          Run diagnostics to troubleshoot authentication issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={loading} className="w-full">
          {loading ? "Running..." : "Run Diagnostics"}
        </Button>

        {diagnostics && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Results</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>

            {/* Environment */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <h5 className="font-medium mb-2">Environment</h5>
              <div className="space-y-1 text-sm">
                <p><strong>Origin:</strong> {diagnostics.environment.origin}</p>
                <p><strong>Protocol:</strong> {diagnostics.environment.protocol}</p>
              </div>
            </div>

            {/* Supabase Config */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <h5 className="font-medium mb-2">Supabase Configuration</h5>
              <div className="space-y-1 text-sm">
                <p><strong>URL:</strong> {diagnostics.supabase.url}</p>
                <p className="flex items-center gap-2">
                  <strong>Anon Key:</strong>
                  {diagnostics.supabase.hasAnonKey ? (
                    <><CheckCircle2 className="w-4 h-4 text-green-500" /> Present</>
                  ) : (
                    <><AlertCircle className="w-4 h-4 text-red-500" /> Missing</>
                  )}
                </p>
              </div>
            </div>

            {/* Session */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <h5 className="font-medium mb-2">Current Session</h5>
              <div className="space-y-1 text-sm">
                <p className="flex items-center gap-2">
                  <strong>Session:</strong>
                  {diagnostics.session?.exists ? (
                    <><CheckCircle2 className="w-4 h-4 text-green-500" /> Active</>
                  ) : (
                    <><AlertCircle className="w-4 h-4 text-yellow-500" /> None</>
                  )}
                </p>
                {diagnostics.session?.email && (
                  <p><strong>Email:</strong> {diagnostics.session.email}</p>
                )}
                {diagnostics.session?.provider && (
                  <p><strong>Provider:</strong> {diagnostics.session.provider}</p>
                )}
                {diagnostics.session?.identities && (
                  <div>
                    <strong>Identities:</strong>
                    <ul className="ml-4 mt-1">
                      {diagnostics.session.identities.map((id: any, idx: number) => (
                        <li key={idx}>• {id.provider}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* OAuth Test */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <h5 className="font-medium mb-2">Google OAuth Test</h5>
              {diagnostics.oauth?.error ? (
                <div className="flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <div>
                    <strong>Error:</strong>
                    <p className="mt-1">{diagnostics.oauth.error}</p>
                  </div>
                </div>
              ) : diagnostics.oauth?.googleUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>OAuth URL generated successfully</span>
                  </div>
                  <div className="mt-2 p-2 bg-background rounded text-xs break-all">
                    {diagnostics.oauth.googleUrl}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Errors */}
            {diagnostics.error && (
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <h5 className="font-medium mb-2 text-red-900">Error</h5>
                <p className="text-sm text-red-700">{diagnostics.error}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
