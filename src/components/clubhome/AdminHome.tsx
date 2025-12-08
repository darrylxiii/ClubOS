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
import { PlatformHealthCard } from "./PlatformHealthCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UnifiedStatsBar } from "./UnifiedStatsBar";
import { DashboardSection } from "./DashboardSection";
import { useRoleStats } from "@/hooks/useRoleStats";
import { UpcomingMeetingsWidget } from "./UpcomingMeetingsWidget";
import { PendingMemberApprovalsWidget } from "./PendingMemberApprovalsWidget";
import { SecurityAlertsWidget } from "./SecurityAlertsWidget";
import { DealPipelineSummaryWidget } from "./DealPipelineSummaryWidget";
import { KPISummaryWidget } from "./KPISummaryWidget";
import { SystemErrorsWidget } from "./SystemErrorsWidget";
import { ActiveMeetingsWidget } from "./ActiveMeetingsWidget";
import { motion } from "framer-motion";

const AdminHomeContent = () => {
  const { stats, loading } = useRoleStats('admin');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <UnifiedStatsBar role="admin" stats={stats} loading={loading} />
      </motion.div>

      {/* Quick Management & Platform Growth */}
      <DashboardSection columns={2}>
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Quick Management
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <Button className="w-full justify-start text-sm" variant="glass" asChild>
              <Link to="/admin/users">
                <Users className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Manage Users & Roles</span>
                <span className="sm:hidden">Users & Roles</span>
              </Link>
            </Button>
            <Button className="w-full justify-start text-sm" variant="glass" asChild>
              <Link to="/admin/companies">
                <Building2 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Manage Companies</span>
                <span className="sm:hidden">Companies</span>
              </Link>
            </Button>
            <Button className="w-full justify-start text-sm" variant="glass" asChild>
              <Link to="/admin/anti-hacking">
                <Shield className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Security Settings</span>
                <span className="sm:hidden">Security</span>
              </Link>
            </Button>
            <Button className="w-full justify-start text-sm" variant="glass" asChild>
              <Link to="/admin/audit-log">
                <Activity className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">View System Logs</span>
                <span className="sm:hidden">System Logs</span>
              </Link>
            </Button>
            <Button className="w-full justify-start text-sm" variant="glass" asChild>
              <Link to="/admin/kpi-command-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">KPI Command Center</span>
                <span className="sm:hidden">KPIs</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
        <PlatformGrowthCard />
      </DashboardSection>

      {/* Critical Widgets Row */}
      <DashboardSection columns={3} mobileColumns={1}>
        <PendingMemberApprovalsWidget />
        <SecurityAlertsWidget />
        <ActiveMeetingsWidget />
      </DashboardSection>

      {/* KPI & Deal Pipeline */}
      <DashboardSection columns={2}>
        <KPISummaryWidget />
        <DealPipelineSummaryWidget />
      </DashboardSection>

      {/* Platform Health & Errors */}
      <DashboardSection columns={2}>
        <PlatformHealthCard />
        <SystemErrorsWidget />
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
