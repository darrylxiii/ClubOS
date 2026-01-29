import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CandidateApplicationTracker } from "@/components/candidate-onboarding/CandidateApplicationTracker";
import { PageLoader } from "@/components/PageLoader";
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";
import { CheckCircle, XCircle, Clock, AlertTriangle, LogIn } from "lucide-react";

interface ApplicationStatus {
  full_name: string;
  account_status: 'pending' | 'approved' | 'declined';
  account_decline_reason: string | null;
  created_at: string;
}

export default function ApplicationStatusPortal() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();
  const [status, setStatus] = useState<ApplicationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchApplicationStatus();
    } else {
      setError('Invalid access link');
      setLoading(false);
    }
  }, [token]);

  const fetchApplicationStatus = async () => {
    try {
      // Use the public view to fetch application status by token
      const { data, error: fetchError } = await supabase
        .from('application_status_public')
        .select('full_name, account_status, account_decline_reason, created_at')
        .eq('application_access_token', token)
        .single();

      if (fetchError || !data) {
        console.error('[ApplicationStatusPortal] Error fetching status:', fetchError);
        setError(t('applicationPortal.invalidToken', 'Invalid or expired access link'));
        setLoading(false);
        return;
      }

      setStatus(data as ApplicationStatus);
    } catch (err) {
      console.error('[ApplicationStatusPortal] Unexpected error:', err);
      setError(t('applicationPortal.invalidToken', 'Invalid or expired access link'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error || !status) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur">
          <div className="container mx-auto px-2 py-1 relative flex justify-center items-center">
            <img src={quantumLogoDark} alt="Quantum Club" className="h-20 w-auto dark:hidden" />
            <img src={quantumLogoLight} alt="Quantum Club" className="h-20 w-auto hidden dark:block" />
            <div className="absolute right-4">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-destructive/10">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-3">
              {t('applicationPortal.invalidToken', 'Invalid or expired access link')}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t('applicationPortal.invalidTokenDescription', 'This link may be invalid. Please contact support or sign in if you\'ve been approved.')}
            </p>
            <Button onClick={() => navigate('/auth')}>
              <LogIn className="w-4 h-4 mr-2" />
              {t('applicationPortal.signIn', 'Sign In')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-2 py-1 relative flex justify-center items-center">
          <img src={quantumLogoDark} alt="Quantum Club" className="h-20 w-auto dark:hidden" />
          <img src={quantumLogoLight} alt="Quantum Club" className="h-20 w-auto hidden dark:block" />
          <div className="absolute right-4">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Pending Status */}
          {status.account_status === 'pending' && (
            <>
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center bg-warning/10">
                  <Clock className="w-10 h-10 text-warning" />
                </div>
                <h1 className="text-3xl font-bold mb-3">
                  {t('applicationPortal.pending.title', 'Application Under Review')}
                </h1>
                <p className="text-lg text-muted-foreground">
                  {t('applicationPortal.pending.description', 'Your application is being reviewed. We\'ll send you an email once a decision is made.')}
                </p>
              </div>

              {/* Application Tracker */}
              <CandidateApplicationTracker />
            </>
          )}

          {/* Approved Status */}
          {status.account_status === 'approved' && (
            <Card className="border-success/30 border-2">
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center bg-success/10">
                  <CheckCircle className="w-10 h-10 text-success" />
                </div>
                <CardTitle className="text-2xl">
                  {t('applicationPortal.approved.title', 'You\'ve Been Approved!')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <p className="text-muted-foreground">
                  {t('applicationPortal.approved.description', 'Congratulations! Check your email for your personal login link, or sign in below.')}
                </p>
                <Button onClick={() => navigate('/auth')} size="lg" className="mt-4">
                  <LogIn className="w-4 h-4 mr-2" />
                  {t('applicationPortal.approved.accessDashboard', 'Sign In')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Declined Status */}
          {status.account_status === 'declined' && (
            <Card className="border-destructive/30 border-2">
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center bg-destructive/10">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
                <CardTitle className="text-2xl">
                  {t('applicationPortal.declined.title', 'Application Update')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                {status.account_decline_reason && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm"><strong>Reason:</strong> {status.account_decline_reason}</p>
                  </div>
                )}
                <p className="text-muted-foreground">
                  {t('applicationPortal.declined.description', 'Thank you for your interest. Unfortunately, we\'re unable to proceed with your application at this time.')}
                </p>
                <p className="text-sm text-muted-foreground">
                  Questions? Contact us at <strong>hello@thequantumclub.com</strong>
                </p>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
