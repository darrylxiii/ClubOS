import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ClubAIHomeChatWidget } from "./ClubAIHomeChatWidget";
import { CommandStrip } from "./CommandStrip";
import { RevenueSparkline } from "./RevenueSparkline";
import { PipelineFunnel } from "./PipelineFunnel";
import { TeamCapacityWidget } from "./TeamCapacityWidget";
import { PartnerEngagementWidget } from "./PartnerEngagementWidget";
import { ActiveMeetingsWidget } from "./ActiveMeetingsWidget";
import { DashboardSection } from "./DashboardSection";
import { DailyBriefingBanner } from "./DailyBriefingBanner";
import { PredictiveSignalsStrip } from "./PredictiveSignalsStrip";
import { AgentActivityWidget } from "./AgentActivityWidget";
import { LiveOperationsWidget } from "./LiveOperationsWidget";

const AdminHomeContent = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Zone 0: Daily Briefing (dismissible) */}
      <DailyBriefingBanner />

      {/* Zone 0.5: Club AI Chat */}
      <ClubAIHomeChatWidget />

      {/* Zone 1: Command Strip — urgent action items */}
      <CommandStrip />

      {/* Zone 2: Intelligence Row — above the fold metrics */}
      <DashboardSection columns={2}>
        <RevenueSparkline />
        <PipelineFunnel />
      </DashboardSection>

      {/* Zone 2.5: Predictive Signals Strip */}
      <PredictiveSignalsStrip />

      {/* Zone 3: Operations Grid — 2×2 layout */}
      <DashboardSection columns={2} mobileColumns={1}>
        <TeamCapacityWidget />
        <PartnerEngagementWidget />
      </DashboardSection>
      <DashboardSection columns={2} mobileColumns={1}>
        <ActiveMeetingsWidget />
        <LiveOperationsWidget />
      </DashboardSection>

      {/* Zone 4: Agent Activity Stream */}
      <DashboardSection>
        <AgentActivityWidget />
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
