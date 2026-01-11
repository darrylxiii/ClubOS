
import { Breadcrumb } from "@/components/Breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CompanyManagement } from "@/components/admin/CompanyManagement";
import { UnifiedUserManagement } from "@/components/admin/UnifiedUserManagement";
import { RoleAssignmentFix } from "@/components/admin/RoleAssignmentFix";
import { AdminAchievementsManager } from "@/components/admin/AdminAchievementsManager";
import { AssessmentResultsManager } from "@/components/admin/AssessmentResultsManager";
import { AdminApplicationHub } from "@/components/admin/AdminApplicationHub";
import { DataIntegrityChecker } from "@/components/admin/revenue/DataIntegrityChecker";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { SSOManagement } from "@/components/admin/SSOManagement";
import { ActivityMonitoringDashboard } from "@/components/admin/ActivityMonitoringDashboard";
import { CompanyEngagementLeaderboard } from "@/components/admin/CompanyEngagementLeaderboard";
import { DisasterRecoveryDashboard } from "@/components/admin/DisasterRecoveryDashboard";
import { SecurityDashboard } from "@/components/admin/security/SecurityDashboard";
import { CompaniesDashboard } from "@/components/admin/companies/CompaniesDashboard";
import { UsersDashboard } from "@/components/admin/users/UsersDashboard";
import { ApplicationsDashboard } from "@/components/admin/applications/ApplicationsDashboard";
import { AchievementsDashboard } from "@/components/admin/achievements/AchievementsDashboard";
import { AssessmentsDashboard } from "@/components/admin/assessments/AssessmentsDashboard";
import { SystemHealthDashboard } from "@/components/admin/system/SystemHealthDashboard";
import { CommissionTiersManager } from "@/components/admin/revenue/CommissionTiersManager";
import { EmployeeCommissionSettings } from "@/components/admin/revenue/EmployeeCommissionSettings";
import { BackfillRunner } from "@/components/admin/revenue/BackfillRunner";
import { useRole } from "@/contexts/RoleContext";
import { Navigate, useNavigate } from "react-router-dom";
import { UnifiedLoader } from "@/components/ui/unified-loader";
import { OceanBackgroundVideo } from "@/components/OceanBackgroundVideo";

const Admin = () => {
  const { currentRole, loading } = useRole();
  const navigate = useNavigate();

  // Wait for role to be loaded before making any decisions
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect non-admins
  if (currentRole !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return (
    <>
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

          <Tabs defaultValue="companies" className="space-y-6">
            <TabsList className="flex w-full max-w-[1600px] overflow-x-auto sticky top-4 z-20 gap-2 justify-start">
              <TabsTrigger value="companies">Companies</TabsTrigger>
              <TabsTrigger value="users">Users & Roles</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="merge">Merge</TabsTrigger>
              <TabsTrigger value="member-requests">Member Requests</TabsTrigger>
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="assessments">Assessments</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="system">System Health</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="support">Support</TabsTrigger>
              <TabsTrigger value="dr">DR</TabsTrigger>
            </TabsList>

            <TabsContent value="companies" className="space-y-6">
              <CompaniesDashboard />
              <CompanyManagement />
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <UsersDashboard />
              <UnifiedUserManagement />
            </TabsContent>

            <TabsContent value="revenue" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Commission Management</CardTitle>
                  <CardDescription>
                    Configure commission tiers and assign them to employees
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <CommissionTiersManager />
                  <EmployeeCommissionSettings />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Financial Dashboard</CardTitle>
                  <CardDescription>
                    Access the full financial dashboard with cash flow, placement fees, and more
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate('/admin/finance')} className="w-full sm:w-auto">
                    Open Financial Dashboard
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>User Activity Analytics</CardTitle>
                  <CardDescription>
                    Comprehensive tracking and analysis of user behavior across the platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      View detailed real-time analytics, user journeys, engagement metrics, frustration signals,
                      search analytics, and partner health monitoring.
                    </p>
                    <Button onClick={() => navigate('/admin/user-activity')} className="w-full sm:w-auto">
                      Open Full Analytics Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <CompanyEngagementLeaderboard />
            </TabsContent>

            <TabsContent value="merge" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      Access the full merge dashboard to manually link candidates to user accounts
                    </p>
                    <Button onClick={() => navigate('/admin/merge')}>
                      Open Merge Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="member-requests" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      Review and approve new member applications from candidates and partners
                    </p>
                    <Button onClick={() => navigate('/admin/member-requests')}>
                      Open Member Requests Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="applications" className="space-y-6">
              <ApplicationsDashboard />
              <AdminApplicationHub />
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              <AchievementsDashboard />
              <AdminAchievementsManager />
            </TabsContent>

            <TabsContent value="assessments" className="space-y-6">
              <AssessmentsDashboard />
              <AssessmentResultsManager />
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <SecurityDashboard />
              <AuditLogViewer />
              <SSOManagement />
            </TabsContent>

            <TabsContent value="system" className="space-y-6">
              <SystemHealthDashboard />
              <Card>
                <CardHeader>
                  <CardTitle>System Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <DisasterRecoveryDashboard />
                  <DataIntegrityChecker />
                  <BackfillRunner />
                  <RoleAssignmentFix />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Compliance & Legal</CardTitle>
                    <CardDescription>Manage legal agreements, data classification, and audit rights</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Button onClick={() => navigate('/admin/compliance/agreements')}>
                        Legal Agreements (DPA/BAA)
                      </Button>
                      <Button onClick={() => navigate('/legal/subprocessors')}>
                        Subprocessor Transparency
                      </Button>
                      <Button onClick={() => navigate('/admin/compliance/data-classification')}>
                        Data Classification
                      </Button>
                      <Button onClick={() => navigate('/admin/compliance/audit-rights')}>
                        Audit Rights Tracking
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Support Tab */}
            <TabsContent value="support">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Support Management</CardTitle>
                    <CardDescription>Manage support tickets, CSM assignments, and knowledge base</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-3 gap-4">
                      <Button onClick={() => navigate('/admin/support/queue')}>
                        Support Queue
                      </Button>
                      <Button onClick={() => navigate('/admin/csm/assignments')}>
                        CSM Assignments
                      </Button>
                      <Button onClick={() => navigate('/admin/kb/articles')}>
                        KB Articles Manager
                      </Button>
                      <Button onClick={() => navigate('/admin/status')}>
                        Status Page
                      </Button>
                      <Button onClick={() => navigate('/support/tickets')}>
                        View All Tickets
                      </Button>
                      <Button onClick={() => navigate('/help')}>
                        Knowledge Base
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* DR Tab */}
            <TabsContent value="dr">
              <Card>
                <CardHeader>
                  <CardTitle>Disaster Recovery</CardTitle>
                  <CardDescription>Comprehensive disaster recovery dashboard and tools</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Button
                    onClick={() => navigate('/admin/dr-comprehensive')}
                    className="w-full"
                    size="lg"
                  >
                    Open Comprehensive DR Dashboard
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Admin;
