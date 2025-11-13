import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Building2, 
  Briefcase, 
  Shield,
  AlertCircle,
  Settings,
  Activity
} from "lucide-react";
import { Link } from "react-router-dom";
import { RecentActivityFeed } from "./RecentActivityFeed";
import { PlatformGrowthCard } from "./PlatformGrowthCard";
import { PlatformHealthCard } from "./PlatformHealthCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const AdminHomeContent = () => {
  console.log('👑 [AdminHome] Component mounting');
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanies: 0,
    totalJobs: 0,
    pendingReviews: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('👑 [AdminHome] Fetching stats...');
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const [usersRes, companiesRes, jobsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('companies')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalCompanies: companiesRes.count || 0,
        totalJobs: jobsRes.count || 0,
        pendingReviews: 0
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* System Health Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground mt-1">Active partners</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">Open positions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReviews}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires review</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
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

        {/* Platform Growth */}
        <PlatformGrowthCard />
      </div>

      {/* Platform Health */}
      <PlatformHealthCard />

      {/* Recent System Activity */}
      <RecentActivityFeed />
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
