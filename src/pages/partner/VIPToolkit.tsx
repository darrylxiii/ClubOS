import { useTranslation } from 'react-i18next';
import { useRole } from '@/contexts/RoleContext';
import { useCandidatePortal } from '@/hooks/useCandidatePortal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from '@/lib/motion';
import { PartnerPageHeader } from '@/components/partner/PartnerPageHeader';
import { BrandedPortalPreview } from '@/components/partner/vip/BrandedPortalPreview';
import { FeedbackSLATracker } from '@/components/partner/vip/FeedbackSLATracker';
import { StageTimelinePreview } from '@/components/partner/vip/StageTimelinePreview';
import { CultureShowcaseEditor } from '@/components/partner/vip/CultureShowcaseEditor';
import { Crown } from 'lucide-react';

export default function VIPToolkit() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();

  const {
    branding,
    portalSettings,
    feedbackSLARate,
    feedbackSLAWeeklyTrend,
    candidatesWaiting,
    isLoading,
  } = useCandidatePortal(companyId);

  // Fetch company name
  const { data: company } = useQuery({
    queryKey: ['vip-company-name', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <PartnerPageHeader
          title={t('vip.pageTitle', 'VIP Candidate Experience')}
          subtitle={t('vip.pageSubtitle', 'Craft a premium experience for every candidate')}
        />
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-muted rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-52 bg-muted rounded-xl" />
            <div className="h-52 bg-muted rounded-xl" />
          </div>
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  // Empty state (no company selected)
  if (!companyId) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <PartnerPageHeader
          title={t('vip.pageTitle', 'VIP Candidate Experience')}
          subtitle={t('vip.pageSubtitle', 'Craft a premium experience for every candidate')}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="p-3 rounded-full bg-primary/10 mb-4">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {t('vip.emptyState.title', 'No company selected')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {t(
              'vip.emptyState.description',
              'Select a company from the sidebar to configure the VIP candidate experience toolkit.',
            )}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PartnerPageHeader
        title={t('vip.pageTitle', 'VIP Candidate Experience')}
        subtitle={t('vip.pageSubtitle', 'Craft a premium experience for every candidate')}
      />

      {/* Top: Branded Portal Preview (full width) */}
      <BrandedPortalPreview
        companyName={company?.name}
        logoUrl={branding.logo_light_url}
        primaryColor={branding.primary_color}
        secondaryColor={branding.secondary_color}
        description={portalSettings.cultureDescription}
      />

      {/* Middle row: FeedbackSLATracker + StageTimelinePreview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FeedbackSLATracker
          complianceRate={feedbackSLARate}
          weeklyTrend={feedbackSLAWeeklyTrend}
          candidatesWaiting={candidatesWaiting}
        />
        <StageTimelinePreview
          companyId={companyId}
          initialNotifications={portalSettings.stageNotifications}
        />
      </div>

      {/* Bottom: CultureShowcaseEditor */}
      <CultureShowcaseEditor
        companyId={companyId}
        initialDescription={portalSettings.cultureDescription}
        initialHighlights={portalSettings.cultureHighlights}
      />
    </div>
  );
}
