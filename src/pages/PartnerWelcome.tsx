import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UnifiedLoader } from '@/components/ui/unified-loader';
import { logger } from '@/lib/logger';
import { WelcomeCeremony } from '@/components/partner/WelcomeCeremony';

/**
 * PartnerWelcome - Concierge welcome screen for pre-provisioned partners
 * 
 * This page is displayed after a partner clicks their magic link or 
 * signs in for the first time after being provisioned by an admin.
 * It shows their company info, assigned strategist, and next steps.
 */
const PartnerWelcome = () => {
  const { t } = useTranslation('partner');
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
        .maybeSingle();

      // If already completed onboarding, go to partner portal
      // Accept both provisioned and invite-based partners

      if (profile?.onboarding_completed_at) {
        navigate('/partner/hub');
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
        .maybeSingle();

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
          .maybeSingle();

        if (strategistProfile) {
          setStrategist({
            name: strategistProfile.full_name || 'Your Strategist',
            email: strategistProfile.email || '',
            avatarUrl: strategistProfile.avatar_url || undefined
          });
        }
      }
    } catch (error) {
      logger.error('Error loading onboarding data', error instanceof Error ? error : new Error(String(error)), { componentName: 'PartnerWelcome' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!user) return;

    try {
      // Log activation event (onboarding_completed_at is already set by PartnerSetup)
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

      toast.success(t('partnerWelcome.welcomeToast', 'Welcome to The Quantum Club!'));
      navigate('/partner/hub');
    } catch (error) {
      logger.error('Error completing onboarding', error instanceof Error ? error : new Error(String(error)), { componentName: 'PartnerWelcome' });
      toast.error(t('partnerWelcome.failedOnboarding', 'Failed to complete onboarding'));
    }
  };

  if (loading || isLoading) {
    return <UnifiedLoader variant="page" showBranding />;
  }

  if (!isProvisioned) {
    return null; // Will redirect in useEffect
  }

  const partnerFirstName = user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0]?.replace(/^\w/, (c: string) => c.toUpperCase()) ||
    'Partner';

  return (
    <WelcomeCeremony
      partnerName={partnerFirstName}
      companyInfo={companyInfo}
      strategist={strategist}
      onComplete={handleCompleteOnboarding}
    />
  );
};

export default PartnerWelcome;
