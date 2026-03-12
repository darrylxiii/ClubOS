import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RevenueTickerStrip } from "./RevenueTickerStrip";
import { RevenueGrowthWidget } from "./RevenueGrowthWidget";
import { AttentionRequiredStrip } from "./AttentionRequiredStrip";
import { AdminPendingReviewsWidget } from "./AdminPendingReviewsWidget";
import { DailyBriefingBanner } from "./DailyBriefingBanner";
import { TeamCapacityWidget } from "./TeamCapacityWidget";
import { PartnerEngagementWidget } from "./PartnerEngagementWidget";
import { AdminTasksWidget } from "./AdminTasksWidget";
import { ActiveMeetingsWidget } from "./ActiveMeetingsWidget";
import { QuickLaunchGrid } from "./QuickLaunchGrid";
import { OperationsMonitor } from "./OperationsMonitor";
import { DashboardSection } from "./DashboardSection";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const AdminHomeContent = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <ScrollReveal variant="fade-up">
        <RevenueTickerStrip />
      </ScrollReveal>

      <ScrollReveal variant="fade-up" delay={0.05}>
        <RevenueGrowthWidget />
      </ScrollReveal>

      <ScrollReveal variant="fade-up" delay={0.08}>
        <AttentionRequiredStrip />
      </ScrollReveal>

      <ScrollReveal variant="fade-scale" delay={0.1}>
        <AdminPendingReviewsWidget />
      </ScrollReveal>

      <ScrollReveal variant="fade-up" delay={0.12}>
        <DailyBriefingBanner />
      </ScrollReveal>

      <ScrollReveal variant="fade-up" delay={0.14}>
        <DashboardSection columns={2} mobileColumns={1}>
          <TeamCapacityWidget />
          <PartnerEngagementWidget />
        </DashboardSection>
      </ScrollReveal>

      <ScrollReveal variant="fade-up" delay={0.16}>
        <DashboardSection columns={2} mobileColumns={1}>
          <AdminTasksWidget />
          <ActiveMeetingsWidget />
        </DashboardSection>
      </ScrollReveal>

      <ScrollReveal variant="fade-scale" delay={0.18}>
        <QuickLaunchGrid />
      </ScrollReveal>

      <ScrollReveal variant="fade-up" delay={0.2}>
        <OperationsMonitor />
      </ScrollReveal>
    </div>
  );
};

export const AdminHome = () => {
  return (
    <ErrorBoundary>
      <AdminHomeContent />
    </ErrorBoundary>
  );
};
