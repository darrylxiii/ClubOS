import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Building2, 
  Shield,
  Settings,
  Activity,
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
import { QUINAnalyticsWidget } from "./QUINAnalyticsWidget";
import { AdminReferralWidget } from "./AdminReferralWidget";
import { PipelineVelocityWidget } from "./PipelineVelocityWidget";
import { PartnerEngagementWidget } from "./PartnerEngagementWidget";
import { EdgeFunctionHealthWidget } from "./EdgeFunctionHealthWidget";

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

      {/* Quick Management & Platform Growth */}
      <DashboardSection columns={2}>
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <T k="common:dashboard.quickManagement.title" fallback="Quick Management" />
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              <T k="common:dashboard.quickManagement.description" fallback="Common admin tasks" />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <Button className="w-full justify-start text-sm" variant="glass" asChild>
              <Link to="/admin">
                <Users className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline"><T k="common:admin.manageUsers" fallback="Manage Users & Roles" /></span>
                <span className="sm:hidden"><T k="common:roles.user" fallback="Users & Roles" /></span>
              </Link>
            </Button>
            <Button className="w-full justify-start text-sm" variant="glass" asChild>
              <Link to="/admin?tab=companies">
                <Building2 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline"><T k="common:admin.manageCompanies" fallback="Manage Companies" /></span>
                <span className="sm:hidden"><T k="common:navigation.admin" fallback="Companies" /></span>
              </Link>
            </Button>
            <Button className="w-full justify-start text-sm" variant="glass" asChild>
              <Link to="/admin/anti-hacking">
                <Shield className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline"><T k="common:admin.securitySettings" fallback="Security Settings" /></span>
                <span className="sm:hidden"><T k="common:settings.tabs.security" fallback="Security" /></span>
              </Link>
            </Button>
            <Button className="w-full justify-start text-sm" variant="glass" asChild>
              <Link to="/admin/audit-log">
                <Activity className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline"><T k="common:admin.viewLogs" fallback="View System Logs" /></span>
                <span className="sm:hidden"><T k="common:navigation.analytics" fallback="System Logs" /></span>
              </Link>
            </Button>
            <Button className="w-full justify-start text-sm" variant="glass" asChild>
              <Link to="/admin/kpi-command-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline"><T k="common:admin.kpiCenter" fallback="KPI Command Center" /></span>
                <span className="sm:hidden"><T k="common:navigation.analytics" fallback="KPIs" /></span>
              </Link>
            </Button>
          </CardContent>
        </Card>
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
        <QUINAnalyticsWidget />
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
