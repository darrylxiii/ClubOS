import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ClubAIHomeChatWidget } from "./ClubAIHomeChatWidget";
import { CommandStrip } from "./CommandStrip";
import { RevenueSparkline } from "./RevenueSparkline";
import { PipelineFunnel } from "./PipelineFunnel";
import { KPISummaryWidget } from "./KPISummaryWidget";
import { PartnerEngagementWidget } from "./PartnerEngagementWidget";
import { ActiveMeetingsWidget } from "./ActiveMeetingsWidget";
import { RecentActivityFeed } from "./RecentActivityFeed";
import { DashboardSection } from "./DashboardSection";

const AdminHomeContent = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Zone 0: Club AI Chat */}
      <ClubAIHomeChatWidget />

      {/* Zone 1: Command Strip — urgent action items */}
      <CommandStrip />

      {/* Zone 2: Intelligence Row — above the fold metrics */}
      <DashboardSection columns={2}>
        <RevenueSparkline />
        <PipelineFunnel />
      </DashboardSection>

      {/* Zone 3: Operations Grid — essential detail widgets */}
      <DashboardSection columns={3} mobileColumns={1}>
        <KPISummaryWidget />
        <PartnerEngagementWidget />
        <ActiveMeetingsWidget />
      </DashboardSection>

      {/* Zone 4: Activity Stream */}
      <DashboardSection>
        <RecentActivityFeed />
      </DashboardSection>
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
