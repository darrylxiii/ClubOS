import { Button } from "@/components/ui/button";
import { 
  UserPlus, 
  Building2, 
  AlertTriangle,
  Settings,
  CheckCircle,
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";
import { RecentActivityFeed } from "./RecentActivityFeed";
import { PlatformGrowthCard } from "./PlatformGrowthCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UnifiedStatsBar } from "./UnifiedStatsBar";
import { DashboardSection } from "./DashboardSection";
import { useRoleStats } from "@/hooks/useRoleStats";
import { UpcomingMeetingsWidget } from "./UpcomingMeetingsWidget";
import { DealPipelineSummaryWidget } from "./DealPipelineSummaryWidget";
import { KPISummaryWidget } from "./KPISummaryWidget";
import { ActiveMeetingsWidget } from "./ActiveMeetingsWidget";
import { RevenueOverviewWidget } from "./RevenueOverviewWidget";
import { WhatsAppPreviewWidget } from "./WhatsAppPreviewWidget";
import { CRMProspectsWidget } from "./CRMProspectsWidget";
import { TopClientsWidget } from "./TopClientsWidget";
import { T } from "@/components/T";
import { motion } from "framer-motion";
import { ClubAIAnalyticsWidget } from "./ClubAIAnalyticsWidget";
import { AdminReferralWidget } from "./AdminReferralWidget";
import { PipelineVelocityWidget } from "./PipelineVelocityWidget";
import { PartnerEngagementWidget } from "./PartnerEngagementWidget";
import { EdgeFunctionHealthWidget } from "./EdgeFunctionHealthWidget";
import { ClubAIHomeChatWidget } from "./ClubAIHomeChatWidget";

const AdminHomeContent = () => {
  const { stats, loading } = useRoleStats('admin');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <UnifiedStatsBar role="admin" stats={stats} loading={loading} />
      </motion.div>

      {/* Club AI Intelligence Hub */}
      <ClubAIHomeChatWidget />

      {/* Quick Management & Platform Growth */}
      <DashboardSection columns={2}>
        <div className="glass-subtle rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div>
            <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <T k="common:dashboard.quickManagement.title" fallback="Quick Management" />
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              <T k="common:dashboard.quickManagement.description" fallback="Common admin tasks" />
            </p>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <Button className="w-full justify-start text-sm" variant="ghost" asChild>
              <Link to="/admin?tab=users">
                <UserPlus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Invite New Member</span>
                <span className="sm:hidden">Invite</span>
              </Link>
            </Button>
            <Button className="w-full justify-start text-sm" variant="ghost" asChild>
              <Link to="/admin?tab=companies">
                <Building2 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Onboard Partner</span>
                <span className="sm:hidden">Onboard</span>
              </Link>
            </Button>
            <Button className="w-full justify-start text-sm" variant="ghost" asChild>
              <Link to="/admin/anti-hacking">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Review Flagged Items</span>
                <span className="sm:hidden">Flagged</span>
              </Link>
            </Button>
            <Button className="w-full justify-start text-sm" variant="ghost" asChild>
              <Link to="/jobs?status=pending">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Approve Pending Jobs</span>
                <span className="sm:hidden">Approve</span>
              </Link>
            </Button>
            <Button className="w-full justify-start text-sm" variant="ghost" asChild>
              <Link to="/admin/kpi-command-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">View KPI Dashboard</span>
                <span className="sm:hidden">KPIs</span>
              </Link>
            </Button>
          </div>
        </div>
        <PlatformGrowthCard />
      </DashboardSection>

      {/* CRM & Clients */}
      <DashboardSection columns={2}>
        <CRMProspectsWidget />
        <TopClientsWidget />
      </DashboardSection>

      {/* KPI, Deal Pipeline & Meetings */}
      <DashboardSection columns={3} mobileColumns={1}>
        <KPISummaryWidget />
        <DealPipelineSummaryWidget />
        <ActiveMeetingsWidget />
      </DashboardSection>

      {/* Revenue & Referrals */}
      <DashboardSection columns={2}>
        <RevenueOverviewWidget />
        <AdminReferralWidget />
      </DashboardSection>

      {/* Pipeline & Partner Health */}
      <DashboardSection columns={2}>
        <PipelineVelocityWidget />
        <PartnerEngagementWidget />
      </DashboardSection>

      {/* AI & System Health */}
      <DashboardSection columns={3} mobileColumns={1}>
        <ClubAIAnalyticsWidget />
        <EdgeFunctionHealthWidget />
        <WhatsAppPreviewWidget />
      </DashboardSection>

      {/* Upcoming Meetings */}
      <DashboardSection>
        <UpcomingMeetingsWidget />
      </DashboardSection>

      {/* Recent System Activity */}
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
