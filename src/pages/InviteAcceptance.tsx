import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MinimalHeader } from "@/components/MinimalHeader";
import { CheckCircle2, AlertCircle, Briefcase, User } from "lucide-react";
import { UnifiedLoader } from "@/components/ui/unified-loader";
import { toast } from "sonner";

export default function InviteAcceptance() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [candidate, setCandidate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    try {
      const { data: inviteData, error: inviteError } = await supabase
        .from('candidate_invitations')
        .select('*, candidate_profiles(*)')
        .eq('invitation_token', token)
        .single();

      if (inviteError || !inviteData) {
        setError('Invalid or expired invitation link');
        setLoading(false);
        return;
      }

      if (new Date(inviteData.expires_at) < new Date()) {
        setError('This invitation has expired');
        setLoading(false);
        return;
      }

      if (inviteData.status === 'accepted') {
        setError('This invitation has already been used');
        setLoading(false);
        return;
      }

      setInvitation(inviteData);
      setCandidate(inviteData.candidate_profiles);
      setLoading(false);
    } catch (err) {
      console.error('Error loading invitation:', err);
      setError('Failed to load invitation');
      setLoading(false);
    }
  };

  const handleSignUp = async (provider: 'google' | 'linkedin' | 'apple') => {
    try {
      // Store invitation email for validation after OAuth
      if (candidate?.email) {
        sessionStorage.setItem('expected_invitation_email', candidate.email);
      }

      if (provider === 'google' || provider === 'apple') {
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/invite/${token}/complete`,
          }
        });
        if (oauthError) throw oauthError;
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: `${window.location.origin}/invite/${token}/complete`,
          scopes: provider === 'linkedin' ? 'r_emailaddress r_liteprofile' : undefined
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Sign up error:', error);
      toast.error('Failed to sign up');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <MinimalHeader showBackButton={false} />
        <UnifiedLoader variant="page" showBranding />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <MinimalHeader showBackButton={false} />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-center">Invalid Invitation</CardTitle>
              <CardDescription className="text-center">{error}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate('/')} variant="outline">
                Go to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MinimalHeader showBackButton={false} />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to The Quantum Club</CardTitle>
            <CardDescription>
              You've been invited to join our exclusive talent platform
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{candidate?.full_name}</h3>
                    {candidate?.current_title && (
                      <p className="text-sm text-muted-foreground">
                        {candidate.current_title}
                        {candidate.current_company && ` at ${candidate.current_company}`}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">{candidate?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {invitation?.job_context && invitation.job_context.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Relevant Opportunities:</p>
                <div className="space-y-2">
                  {invitation.job_context.map((job: any, idx: number) => (
                    <Card key={idx}>
                      <CardContent className="py-3 px-4 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{job.job_title}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {invitation?.message_template && (
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <p className="text-sm whitespace-pre-wrap">{invitation.message_template}</p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Create your account to get started
              </p>

              <Button
                className="w-full"
                size="lg"
                onClick={() => handleSignUp('google')}
              >
                Continue with Google
              </Button>

              <Button
                className="w-full"
                size="lg"
                variant="outline"
                onClick={() => handleSignUp('linkedin')}
              >
                Continue with LinkedIn
              </Button>

              <Button
                className="w-full"
                size="lg"
                variant="outline"
                onClick={() => handleSignUp('apple')}
              >
                Continue with Apple
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
