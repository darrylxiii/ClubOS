import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CandidateApplicationTracker } from "@/components/candidate-onboarding/CandidateApplicationTracker";
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";
import { XCircle, Building2, Clock } from "lucide-react";
import { PageLoader } from "@/components/PageLoader";
import { logger } from "@/lib/logger";

interface ProfileStatus {
  account_status: 'pending' | 'approved' | 'declined';
  account_decline_reason: string | null;
  full_name: string;
}

type UserType = 'candidate' | 'partner' | 'unknown';

export default function PendingApproval() {
  const { t } = useTranslation('common');
  const [status, setStatus] = useState<ProfileStatus | null>(null);
  const [userType, setUserType] = useState<UserType>('unknown');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkApprovalStatus();

    // Fallback polling every 60s (realtime handles the fast path)
    const interval = setInterval(checkApprovalStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Realtime subscription for instant approval detection
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('pending-approval-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const newStatus = payload.new.account_status as string;
          logger.info('[PendingApproval] Realtime status update', { newStatus });

          if (newStatus === 'approved') {
            navigate('/home');
          } else if (newStatus === 'declined') {
            setStatus(prev => prev ? {
              ...prev,
              account_status: 'declined',
              account_decline_reason: payload.new.account_decline_reason as string | null,
            } : prev);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, navigate]);

  const checkApprovalStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setStatus({ 
          account_status: 'pending', 
          account_decline_reason: null, 
          full_name: '' 
        });
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('account_status, account_decline_reason, full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return;

      setStatus(data as ProfileStatus);

      // Determine user type from roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const roleList = roles?.map(r => r.role) || [];
      if (roleList.includes('partner')) {
        setUserType('partner');
      } else {
        setUserType('candidate');
      }

      if (data.account_status === 'approved') {
        navigate('/home');
      }
    } catch (error) {
      logger.error('Error checking status:', error instanceof Error ? error : new Error(String(error)));
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

  const firstName = status.full_name?.split(' ')[0] || '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-2 py-1 relative flex justify-center items-center">
          <img src={quantumLogoDark} alt={"Quantum Club"} className="h-20 w-auto dark:hidden" />
          <img src={quantumLogoLight} alt={"Quantum Club"} className="h-20 w-auto hidden dark:block" />
          <div className="absolute right-4 flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              {t('pendingApproval.signOut')}
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
                <h1 className="text-3xl font-bold mb-3">
                  {firstName ? t('pendingApproval.titleWithName', { name: firstName }) : t('pendingApproval.title')}
                </h1>
                <p className="text-lg text-muted-foreground">
                  {userType === 'partner'
                    ? t('pendingApproval.partnerDescription')
                    : t('pendingApproval.candidateDescription')}
                </p>
              </div>

              {userType === 'partner' ? (
                <Card className="border-border/50">
                  <CardContent className="py-8">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{t('pendingApproval.partnerReviewTitle')}</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                          {t('pendingApproval.partnerReviewDescription')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t('pendingApproval.typicalReviewTime')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <CandidateApplicationTracker />
              )}
            </>
          )}

          {status.account_status === 'declined' && (
            <Card className="border-destructive/30 border-2">
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center bg-destructive/10">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
                <CardTitle className="text-2xl">{t('pendingApproval.declined')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                {status.account_decline_reason && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm"><strong>{t('pendingApproval.reason')}</strong> {status.account_decline_reason}</p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {t('pendingApproval.declinedContact')}{" "}
                  <strong>info@thequantumclub.com</strong>
                </p>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
