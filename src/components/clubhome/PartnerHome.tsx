import { lazy, Suspense } from "react";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleStats } from "@/hooks/useRoleStats";
import { usePartnerDataPopulation } from "@/hooks/usePartnerDataPopulation";
import { usePartnerRealtime } from "@/hooks/usePartnerRealtime";
import { usePartnerActivation } from "@/hooks/usePartnerActivation";

import { UnifiedStatsBar } from "./UnifiedStatsBar";
import { DashboardSection } from "./DashboardSection";
import { PendingReviewsWidget } from "../partner/PendingReviewsWidget";
import { HiringPipelineOverview } from "./HiringPipelineOverview";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { ErrorBoundary } from "@/components/ui/error-boundary";

import { PartnerActionStrip } from "./partner/PartnerActionStrip";
import { PartnerStrategistStrip } from "./partner/PartnerStrategistStrip";
import { OpenRolesSummary } from "./partner/OpenRolesSummary";
import { PartnerActivityFeedUnified } from "./partner/PartnerActivityFeedUnified";
import { UpcomingScheduleWidget } from "./partner/UpcomingScheduleWidget";
import { PartnerActivationChecklist } from "./partner/PartnerActivationChecklist";

// Lazy-load widgets that depend on optional tables to prevent cascade crashes
const DailyBriefingBanner = lazy(() => import("./DailyBriefingBanner").then(m => ({ default: m.DailyBriefingBanner })));
const SmartAlertsPanel = lazy(() => import("../partner/SmartAlertsPanel").then(m => ({ default: m.SmartAlertsPanel })));
const OfferPipelineWidget = lazy(() => import("../partner/OfferPipelineWidget").then(m => ({ default: m.OfferPipelineWidget })));
const MarketIntelligenceWidget = lazy(() => import("../partner/MarketIntelligenceWidget").then(m => ({ default: m.MarketIntelligenceWidget })));

import { Card, CardContent } from "@/components/ui/card";
import { Building, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { useTranslation } from 'react-i18next';

/** Wrapper that silently catches widget errors instead of crashing the dashboard */
function SafeWidget({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

export const PartnerHome = () => {
  const { t } = useTranslation('common');
  const { companyId } = useRole();
  const { user } = useAuth();
  const { stats, loading } = useRoleStats('partner', undefined, companyId || undefined);
  const activation = usePartnerActivation(companyId || null);

  // Only show setup CTA if force_password_change is still true (setup not completed)
  const needsSetup = user?.user_metadata?.force_password_change === true;

  usePartnerDataPopulation(companyId || undefined);
  usePartnerRealtime(companyId || undefined);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Zone 0: Stats Bar */}
      <ScrollReveal variant="fade-up">
        <UnifiedStatsBar role="partner" stats={stats} loading={loading} />
      </ScrollReveal>

      {/* Daily Briefing */}
      <ScrollReveal variant="fade-up" delay={0.04}>
        <SafeWidget>
          <DailyBriefingBanner />
        </SafeWidget>
      </ScrollReveal>

      {/* Smart Alerts */}
      {companyId && (
        <ScrollReveal variant="fade-up" delay={0.08}>
          <SafeWidget>
            <SmartAlertsPanel companyId={companyId} />
          </SafeWidget>
        </ScrollReveal>
      )}

      {/* Action Required Strip */}
      <ScrollReveal variant="fade-up" delay={0.12}>
        <PartnerActionStrip />
      </ScrollReveal>

      {/* Activation Checklist (shown until complete or dismissed) */}
      {companyId && !activation.loading && !activation.allComplete && !activation.dismissed && (
        <ScrollReveal variant="fade-up" delay={0.16}>
          <PartnerActivationChecklist companyId={companyId} />
        </ScrollReveal>
      )}

      {/* Your Strategist */}
      {companyId && (
        <ScrollReveal variant="fade-up" delay={0.20}>
          <PartnerStrategistStrip companyId={companyId} />
        </ScrollReveal>
      )}

      {/* Pipeline + Open Roles + Pending Reviews + Offers */}
      {companyId && (
        <ScrollReveal variant="fade-up" delay={0.24}>
          <DashboardSection columns={2}>
            <div className="space-y-4">
              <PendingReviewsWidget />
              <HiringPipelineOverview companyId={companyId} />
              <SafeWidget>
                <OfferPipelineWidget companyId={companyId} />
              </SafeWidget>
            </div>
            <OpenRolesSummary companyId={companyId} />
          </DashboardSection>
        </ScrollReveal>
      )}

      {/* Hiring Metrics */}
      {companyId && (
        <ScrollReveal variant="fade-up" delay={0.28}>
          <SafeWidget>
            <MarketIntelligenceWidget companyId={companyId} />
          </SafeWidget>
        </ScrollReveal>
      )}

      {/* Activity Feed + Upcoming Schedule */}
      {companyId && (
        <ScrollReveal variant="fade-up" delay={0.32}>
          <DashboardSection columns={2}>
            <PartnerActivityFeedUnified companyId={companyId} />
            <UpcomingScheduleWidget />
          </DashboardSection>
        </ScrollReveal>
      )}

      {/* No-company fallback: onboarding card — only show if setup incomplete */}
      {!companyId && needsSetup && (
        <ScrollReveal variant="fade-up" delay={0.04}>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col items-center text-center py-10 px-6">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Building className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('partnerHome.welcomeToTheQuantumClub')}</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">{t('partnerHome.completeYourAccountSetupToGetStartedWith')}</p>
              <Link to="/partner-setup">
                <RainbowButton className="h-11 px-6 text-sm">
                  {t('partnerHome.completeSetup', 'Complete Setup')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </RainbowButton>
              </Link>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}
      {/* No company linked but setup done — show contact message */}
      {!companyId && !needsSetup && (
        <ScrollReveal variant="fade-up" delay={0.04}>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col items-center text-center py-10 px-6">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Building className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('partnerHome.companySetupInProgress')}</h3>
              <p className="text-sm text-muted-foreground max-w-md">{t('partnerHome.yourStrategistIsFinalisingYourCompanyPro')}</p>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}
    </div>
  );
};
