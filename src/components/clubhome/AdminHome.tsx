import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Building2, 
  Shield,
  Settings,
  Activity
} from "lucide-react";
import { Link } from "react-router-dom";
import { RecentActivityFeed } from "./RecentActivityFeed";
import { PlatformGrowthCard } from "./PlatformGrowthCard";
import { PlatformHealthCard } from "./PlatformHealthCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UnifiedStatsBar } from "./UnifiedStatsBar";
import { DashboardSection } from "./DashboardSection";
import { useRoleStats } from "@/hooks/useRoleStats";

const AdminHomeContent = () => {
  const { stats, loading } = useRoleStats('admin');

  return (
    <div className="space-y-6">
      {/* Stats at top */}
      <UnifiedStatsBar role="admin" stats={stats} loading={loading} />

      {/* Quick Management & Platform Growth */}
      <DashboardSection columns={2}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Quick Management
            </CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="glass" asChild>
              <Link to="/admin">
                <Users className="h-4 w-4 mr-2" />
                Manage Users & Roles
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="glass" asChild>
              <Link to="/admin">
                <Building2 className="h-4 w-4 mr-2" />
                Manage Companies
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="glass" asChild>
              <Link to="/admin">
                <Shield className="h-4 w-4 mr-2" />
                Security Settings
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="glass" asChild>
              <Link to="/admin">
                <Activity className="h-4 w-4 mr-2" />
                View System Logs
              </Link>
            </Button>
          </CardContent>
        </Card>
        <PlatformGrowthCard />
      </DashboardSection>

      {/* Platform Health */}
      <DashboardSection>
        <PlatformHealthCard />
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
