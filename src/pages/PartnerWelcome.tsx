import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Building2, Users, CalendarClock, ArrowRight, Sparkles, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UnifiedLoader } from '@/components/ui/unified-loader';

/**
 * PartnerWelcome - Concierge welcome screen for pre-provisioned partners
 * 
 * This page is displayed after a partner clicks their magic link or 
 * signs in for the first time after being provisioned by an admin.
 * It shows their company info, assigned strategist, and next steps.
 */
const PartnerWelcome = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [companyInfo, setCompanyInfo] = useState<{ name: string; role: string } | null>(null);
  const [strategist, setStrategist] = useState<{ name: string; email: string; avatarUrl?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProvisioned, setIsProvisioned] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      loadOnboardingData();
    }
  }, [user, loading, navigate]);

  const loadOnboardingData = async () => {
    if (!user) return;

    try {
      // Check if user was pre-provisioned
      const { data: profile } = await supabase
        .from('profiles')
        .select('provisioned_by, provisioned_at, assigned_strategist_id, admin_verified_email, onboarding_completed_at')
        .eq('id', user.id)
        .single();

      // If not provisioned or already completed onboarding, redirect
      if (!profile?.provisioned_by) {
        navigate('/home');
        return;
      }

      if (profile?.onboarding_completed_at) {
        navigate('/partner');
        return;
      }

      setIsProvisioned(true);

      // Get company membership
      const { data: membership } = await supabase
        .from('company_members')
        .select(`
          role,
          companies (name)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (membership) {
        const companies = membership.companies as { name: string } | null;
        setCompanyInfo({
          name: companies?.name || 'Your Organization',
          role: membership.role
        });
      }

      // Get assigned strategist
      if (profile?.assigned_strategist_id) {
        const { data: strategistProfile } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url')
          .eq('id', profile.assigned_strategist_id)
          .single();

        if (strategistProfile) {
          setStrategist({
            name: strategistProfile.full_name || 'Your Strategist',
            email: strategistProfile.email || '',
            avatarUrl: strategistProfile.avatar_url || undefined
          });
        }
      }
    } catch (error) {
      console.error('Error loading onboarding data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id);

      // Log activation event
      await supabase
        .from('activation_events')
        .insert({
          user_id: user.id,
          event_type: 'partner_onboarding_completed',
          event_category: 'onboarding',
          milestone_name: 'partner_welcome',
          event_data: {
            company_name: companyInfo?.name,
            has_strategist: !!strategist
          }
        });

      toast.success('Welcome to The Quantum Club!');
      navigate('/partner');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete onboarding');
    }
  };

  if (loading || isLoading) {
    return <UnifiedLoader variant="page" showBranding />;
  }

  if (!isProvisioned) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-2 border-primary/20 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <Badge variant="secondary" className="mx-auto mb-4">
              <Shield className="w-3 h-3 mr-1" />
              Pre-verified Account
            </Badge>
            <CardTitle className="text-3xl font-black uppercase tracking-tight">
              Welcome, Partner
            </CardTitle>
            <CardDescription className="text-lg">
              Your exclusive access to The Quantum Club has been activated
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Company Info */}
            {companyInfo && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Your Organization</p>
                  <p className="font-semibold text-lg">{companyInfo.name}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {companyInfo.role}
                </Badge>
              </motion.div>
            )}

            {/* Strategist Info */}
            {strategist && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center overflow-hidden">
                  {strategist.avatarUrl ? (
                    <img 
                      src={strategist.avatarUrl} 
                      alt={strategist.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Your Dedicated Strategist</p>
                  <p className="font-semibold text-lg">{strategist.name}</p>
                  <p className="text-sm text-muted-foreground">{strategist.email}</p>
                </div>
              </motion.div>
            )}

            {/* What's Next */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="pt-4"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                What's Next
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Explore Open Roles</p>
                    <p className="text-sm text-muted-foreground">
                      Browse exclusive opportunities curated for your network
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Submit Candidates</p>
                    <p className="text-sm text-muted-foreground">
                      Introduce top talent through our streamlined process
                    </p>
                  </div>
                </div>
                {strategist && (
                  <div className="flex items-start gap-3">
                    <CalendarClock className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Schedule Your Onboarding Call</p>
                      <p className="text-sm text-muted-foreground">
                        Meet with {strategist.name} for a personalized introduction
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="pt-6"
            >
              <Button
                size="lg"
                className="w-full h-14 text-lg font-semibold"
                onClick={handleCompleteOnboarding}
              >
                Enter Partner Portal
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PartnerWelcome;
