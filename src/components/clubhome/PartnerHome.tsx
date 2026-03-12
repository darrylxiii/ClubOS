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

export const PartnerHome = () => {
  const { companyId } = useRole();
  const { user } = useAuth();
  const { stats, loading } = useRoleStats('partner', undefined, companyId || undefined);

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
    </div>
  );
};
