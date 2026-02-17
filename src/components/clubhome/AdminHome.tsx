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
import { AdminTasksWidget } from "./AdminTasksWidget";
import { KPIScorecard } from "./KPIScorecard";
import { OperationalEfficiencyWidget } from "./OperationalEfficiencyWidget";
import { NPSPulseWidget } from "./NPSPulseWidget";

const AdminHomeContent = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Zone 0: Daily Briefing */}
      <DailyBriefingBanner />

      {/* Zone 0.5: Club AI Chat */}
      <ClubAIHomeChatWidget />

      {/* Zone 1: Command Strip */}
      <CommandStrip />

      {/* Zone 2: Intelligence Row */}
      <DashboardSection columns={2}>
        <RevenueSparkline />
        <PipelineFunnel />
      </DashboardSection>

      {/* Zone 2.5: KPI Scorecard — four pillars */}
      <KPIScorecard />

      {/* Zone 3: Predictive Signals */}
      <PredictiveSignalsStrip />

      {/* Zone 3.5: Team & Partner */}
      <DashboardSection columns={2} mobileColumns={1}>
        <TeamCapacityWidget />
        <PartnerEngagementWidget />
      </DashboardSection>

      {/* Zone 4: Operational Efficiency + NPS */}
      <DashboardSection columns={2} mobileColumns={1}>
        <OperationalEfficiencyWidget />
        <NPSPulseWidget />
      </DashboardSection>

      {/* Zone 4.5: Tasks + Meetings */}
      <DashboardSection columns={2} mobileColumns={1}>
        <AdminTasksWidget />
        <ActiveMeetingsWidget />
      </DashboardSection>

      {/* Zone 5: Live Operations */}
      <DashboardSection columns={2} mobileColumns={1}>
        <LiveOperationsWidget />
      </DashboardSection>

      {/* Zone 6: Agent Activity */}
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
