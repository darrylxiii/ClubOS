import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CandidateApplicationTracker } from "@/components/candidate-onboarding/CandidateApplicationTracker";
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";
import { XCircle } from "lucide-react";
import { PageLoader } from "@/components/PageLoader";

interface ProfileStatus {
  account_status: 'pending' | 'approved' | 'declined';
  account_decline_reason: string | null;
  full_name: string;
}

export default function PendingApproval() {
  const [status, setStatus] = useState<ProfileStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkApprovalStatus();

    // Poll for status updates every 30 seconds
    const interval = setInterval(checkApprovalStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkApprovalStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('account_status, account_decline_reason, full_name')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setStatus(data as ProfileStatus);

      // Auto-redirect if approved
      if (data.account_status === 'approved') {
        navigate('/home');
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!status) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-2 py-1 relative flex justify-center items-center">
          <img src={quantumLogoDark} alt="Quantum Club" className="h-20 w-auto dark:hidden" />
          <img src={quantumLogoLight} alt="Quantum Club" className="h-20 w-auto hidden dark:block" />
          <div className="absolute right-4 flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          
          {status.account_status === 'pending' && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-3">Application Under Review</h1>
                <p className="text-lg text-muted-foreground">
                  Thank you for your application. Darryl is reviewing your profile now.
                </p>
              </div>

              {/* Show existing CandidateApplicationTracker */}
              <CandidateApplicationTracker />
            </>
          )}

          {status.account_status === 'declined' && (
            <Card className="border-destructive/30 border-2">
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center bg-destructive/10">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
                <CardTitle className="text-2xl">Application Not Approved</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                {status.account_decline_reason && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm"><strong>Reason:</strong> {status.account_decline_reason}</p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Thank you for your interest. If you have questions, contact us at{" "}
                  <strong>hello@thequantumclub.com</strong>
                </p>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
