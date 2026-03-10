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

const AdminHomeContent = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Zone 1: Revenue Ticker — the numbers a CEO checks first */}
      <RevenueTickerStrip />

      {/* Zone 2: Revenue & Growth deep-dive */}
      <RevenueGrowthWidget />

      {/* Zone 3: Attention Required — merged urgency + signals */}
      <AttentionRequiredStrip />

      {/* Zone 3b: Internal Review Queue */}
      <AdminPendingReviewsWidget />

      {/* Zone 4: Daily Briefing */}
      <DailyBriefingBanner />

      {/* Zone 5: Two-column operations */}
      <DashboardSection columns={2} mobileColumns={1}>
        <TeamCapacityWidget />
        <PartnerEngagementWidget />
      </DashboardSection>

      <DashboardSection columns={2} mobileColumns={1}>
        <AdminTasksWidget />
        <ActiveMeetingsWidget />
      </DashboardSection>

      {/* Zone 6: Quick Launch */}
      <QuickLaunchGrid />

      {/* Zone 7: Operations Monitor (collapsed) */}
      <OperationsMonitor />
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
