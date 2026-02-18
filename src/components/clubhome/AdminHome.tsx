import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ClubAIHomeChatWidget } from "./ClubAIHomeChatWidget";
import { CommandStrip } from "./CommandStrip";
import { RevenueGrowthWidget } from "./RevenueGrowthWidget";
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

      {/* Zone 2: Revenue & Growth */}
      <RevenueGrowthWidget />

      {/* Zone 2.5: KPI Scorecard (merged power widget) */}
      <KPIScorecard />

      {/* Zone 3: Predictive Signals */}
      <PredictiveSignalsStrip />

      {/* Zone 3.5: Team & Partner */}
      <DashboardSection columns={2} mobileColumns={1}>
        <TeamCapacityWidget />
        <PartnerEngagementWidget />
      </DashboardSection>

      {/* Zone 4: NPS + Tasks */}
      <DashboardSection columns={2} mobileColumns={1}>
        <NPSPulseWidget />
        <AdminTasksWidget />
      </DashboardSection>

      {/* Zone 4.5: Meetings */}
      <DashboardSection>
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
