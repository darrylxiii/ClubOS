import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleStats } from "@/hooks/useRoleStats";
import { usePartnerDataPopulation } from "@/hooks/usePartnerDataPopulation";
import { usePartnerRealtime } from "@/hooks/usePartnerRealtime";

import { UnifiedStatsBar } from "./UnifiedStatsBar";
import { DashboardSection } from "./DashboardSection";
import { PendingReviewsWidget } from "../partner/PendingReviewsWidget";
import { HiringPipelineOverview } from "./HiringPipelineOverview";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

import { PartnerActionStrip } from "./partner/PartnerActionStrip";
import { PartnerStrategistStrip } from "./partner/PartnerStrategistStrip";
import { OpenRolesSummary } from "./partner/OpenRolesSummary";
import { PartnerActivityFeedUnified } from "./partner/PartnerActivityFeedUnified";
import { UpcomingScheduleWidget } from "./partner/UpcomingScheduleWidget";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { RainbowButton } from "@/components/ui/rainbow-button";

export const PartnerHome = () => {
  const { companyId } = useRole();
  const { user } = useAuth();
  const { stats, loading } = useRoleStats('partner', undefined, companyId || undefined);

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

      {/* Zone 1: Action Required Strip */}
      <ScrollReveal variant="fade-up" delay={0.04}>
        <PartnerActionStrip />
      </ScrollReveal>

      {/* Zone 2: Your Strategist */}
      {companyId && (
        <ScrollReveal variant="fade-up" delay={0.08}>
          <PartnerStrategistStrip companyId={companyId} />
        </ScrollReveal>
      )}

      {/* Zone 3: Pipeline + Open Roles + Pending Reviews */}
      {companyId && (
        <ScrollReveal variant="fade-up" delay={0.12}>
          <DashboardSection columns={2}>
            <div className="space-y-4">
              <PendingReviewsWidget />
              <HiringPipelineOverview companyId={companyId} />
            </div>
            <OpenRolesSummary companyId={companyId} />
          </DashboardSection>
        </ScrollReveal>
      )}

      {/* Zone 4 + 5: Activity Feed + Upcoming Schedule */}
      {companyId && (
        <ScrollReveal variant="fade-up" delay={0.16}>
          <DashboardSection columns={2}>
            <PartnerActivityFeedUnified companyId={companyId} />
            <UpcomingScheduleWidget />
          </DashboardSection>
        </ScrollReveal>
      )}

      {/* No-company fallback: onboarding card */}
      {!companyId && (
        <ScrollReveal variant="fade-up" delay={0.08}>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col items-center text-center py-10 px-6">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Building className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Welcome to The Quantum Club</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Complete your company setup to start posting roles and receiving curated candidate shortlists
              </p>
              <Link to="/partner-setup">
                <RainbowButton className="h-11 px-6 text-sm">
                  Complete Setup
                  <ArrowRight className="h-4 w-4 ml-2" />
                </RainbowButton>
              </Link>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}
    </div>
  );
};
