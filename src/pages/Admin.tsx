import { AppLayout } from "@/components/AppLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CompanyManagement } from "@/components/admin/CompanyManagement";
import { UnifiedUserManagement } from "@/components/admin/UnifiedUserManagement";
import { AdminRoleSwitcher } from "@/components/admin/AdminRoleSwitcher";
import { RoleAssignmentFix } from "@/components/admin/RoleAssignmentFix";
import { AdminAchievementsManager } from "@/components/admin/AdminAchievementsManager";
import { AssessmentResultsManager } from "@/components/admin/AssessmentResultsManager";
import { AdminApplicationHub } from "@/components/admin/AdminApplicationHub";
import { DataIntegrityChecker } from "@/components/admin/DataIntegrityChecker";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { SSOManagement } from "@/components/admin/SSOManagement";
import { ActivityMonitoringDashboard } from "@/components/admin/ActivityMonitoringDashboard";
import { CompanyEngagementLeaderboard } from "@/components/admin/CompanyEngagementLeaderboard";
import { useRole } from "@/contexts/RoleContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { OceanBackgroundVideo } from "@/components/OceanBackgroundVideo";

const Admin = () => {
  const { currentRole, loading } = useRole();

  // Wait for role to be loaded before making any decisions
  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Redirect non-admins
  if (currentRole !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return (
    <AppLayout>
      <div className="relative">
        <OceanBackgroundVideo />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-8 lg:py-12">
        <Breadcrumb 
          items={[
            { label: 'Home', path: '/home' },
            { label: 'Admin Control Panel' }
          ]}
        />
        
        <div className="space-y-4 mb-12">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8" />
            <h1 className="text-4xl font-black uppercase tracking-tight">
              Admin Control Panel
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Manage companies, users, and system configuration
          </p>
        </div>

        {/* Role Switcher */}
        <div className="mb-8">
          <AdminRoleSwitcher />
        </div>

        <Tabs defaultValue="companies" className="space-y-6">
            <TabsList className="grid w-full grid-cols-9 max-w-7xl sticky top-4 z-20">
              <TabsTrigger value="companies" onClick={(e) => e.currentTarget.blur()}>Companies</TabsTrigger>
              <TabsTrigger value="users" onClick={(e) => e.currentTarget.blur()}>Users & Roles</TabsTrigger>
              <TabsTrigger value="activity" onClick={(e) => e.currentTarget.blur()}>Activity</TabsTrigger>
              <TabsTrigger value="merge" onClick={(e) => e.currentTarget.blur()}>Merge</TabsTrigger>
              <TabsTrigger value="applications" onClick={(e) => e.currentTarget.blur()}>Applications</TabsTrigger>
              <TabsTrigger value="achievements" onClick={(e) => e.currentTarget.blur()}>Achievements</TabsTrigger>
              <TabsTrigger value="assessments" onClick={(e) => e.currentTarget.blur()}>Assessments</TabsTrigger>
              <TabsTrigger value="security" onClick={(e) => e.currentTarget.blur()}>Security</TabsTrigger>
              <TabsTrigger value="system" onClick={(e) => e.currentTarget.blur()}>System Health</TabsTrigger>
            </TabsList>

          <TabsContent value="companies" className="space-y-4">
            <CompanyManagement />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UnifiedUserManagement />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <ActivityMonitoringDashboard />
            <CompanyEngagementLeaderboard />
          </TabsContent>

          <TabsContent value="merge" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    Access the full merge dashboard to manually link candidates to user accounts
                  </p>
                  <Button onClick={() => window.location.href = '/admin/merge-dashboard'}>
                    Open Merge Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            <AdminApplicationHub />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <AdminAchievementsManager />
          </TabsContent>

          <TabsContent value="assessments" className="space-y-4">
            <AssessmentResultsManager />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <AuditLogViewer />
            <SSOManagement />
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <DataIntegrityChecker />
            <RoleAssignmentFix />
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </AppLayout>
  );
};

export default Admin;
