
import { Breadcrumb } from "@/components/Breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Loader2, Users } from "lucide-react";
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
import { StrategistManagementModal } from "@/components/admin/StrategistManagementModal";
import { useRole } from "@/contexts/RoleContext";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { UnifiedLoader } from "@/components/ui/unified-loader";
import { OceanBackgroundVideo } from "@/components/OceanBackgroundVideo";

const Admin = () => {
  const { t } = useTranslation('common');
  const { currentRole, loading } = useRole();
  const navigate = useNavigate();

  // Wait for role to be loaded before making any decisions
  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-[60vh]">
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
        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <Breadcrumb
            items={[
              { label: t('text.admin.home', 'Home'), path: '/home' },
              { label: t('text.admin.adminControlPanel', 'Admin Control Panel') }
            ]}
          />

          <div className="space-y-4 mb-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-8 h-8" />
                <h1 className="text-4xl font-black uppercase tracking-tight">{t('admin.title')}</h1>
              </div>
              <StrategistManagementModal 
                trigger={
                  <Button variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />
                    Manage Strategists
                  </Button>
                }
              />
            </div>
            <p className="text-lg text-muted-foreground">{t('admin.desc')}</p>
          </div>

          <Tabs defaultValue="companies" className="space-y-6">
            <TabsList className="flex w-full max-w-[1600px] overflow-x-auto sticky top-4 z-20 gap-2 justify-start">
              <TabsTrigger value="companies">{t('admin.tabCompanies')}</TabsTrigger>
              <TabsTrigger value="users" onClick={() => navigate('/admin/users')}>Users & Roles →</TabsTrigger>
              <TabsTrigger value="revenue">{t('admin.tabRevenue')}</TabsTrigger>
              <TabsTrigger value="activity">{t('admin.tabActivity')}</TabsTrigger>
              <TabsTrigger value="merge">{t('admin.tabMerge')}</TabsTrigger>
              <TabsTrigger value="member-requests">{t('admin.tabMemberrequests')}</TabsTrigger>
              <TabsTrigger value="applications">{t('admin.tabApplications')}</TabsTrigger>
              <TabsTrigger value="achievements">{t('admin.tabAchievements')}</TabsTrigger>
              <TabsTrigger value="assessments">{t('admin.tabAssessments')}</TabsTrigger>
              <TabsTrigger value="security">{t('admin.tabSecurity')}</TabsTrigger>
              <TabsTrigger value="system">{t('admin.tabSystemhealth')}</TabsTrigger>
              <TabsTrigger value="compliance">{t('admin.tabCompliance')}</TabsTrigger>
              <TabsTrigger value="support">{t('admin.tabSupport')}</TabsTrigger>
              <TabsTrigger value="dr">{t('text.admin.dr', 'DR')}</TabsTrigger>
            </TabsList>

            <TabsContent value="companies" className="space-y-6">
              <CompaniesDashboard />
              <CompanyManagement />
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">{t('admin.desc2')}</p>
                <Button onClick={() => navigate('/admin/users')}>{t('text.admin.openUserManagement', 'Open User Management')}</Button>
              </div>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('text.admin.commissionManagement', 'Commission Management')}</CardTitle>
                  <CardDescription>{t('text.admin.configureCommissionTiersAndAssignThem', 'Configure commission tiers and assign them to employees')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <CommissionTiersManager />
                  <EmployeeCommissionSettings />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('text.admin.financialDashboard', 'Financial Dashboard')}</CardTitle>
                  <CardDescription>{t('text.admin.accessTheFullFinancialDashboardWith', 'Access the full financial dashboard with cash flow, placement fees, and more')}</CardDescription>
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
                  <CardTitle>{t('text.admin.userActivityAnalytics', 'User Activity Analytics')}</CardTitle>
                  <CardDescription>{t('text.admin.comprehensiveTrackingAndAnalysisOfUser', 'Comprehensive tracking and analysis of user behavior across the platform')}</CardDescription>
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
                    <p className="text-muted-foreground">{t('admin.desc3')}</p>
                    <Button onClick={() => navigate('/admin/merge')}>
                      {t('text.admin.openMergeDashboard', 'Open Merge Dashboard')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="member-requests" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">{t('admin.desc4')}</p>
                    <Button onClick={() => navigate('/admin/member-requests')}>
                      {t('text.admin.openMemberRequestsDashboard', 'Open Member Requests Dashboard')}
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
                  <CardTitle>{t('text.admin.systemTools', 'System Tools')}</CardTitle>
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
                    <CardTitle>{t('text.admin.complianceLegal', 'Compliance & Legal')}</CardTitle>
                    <CardDescription>{t('text.admin.manageLegalAgreementsDataClassificationAnd', 'Manage legal agreements, data classification, and audit rights')}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Button onClick={() => navigate('/admin/compliance/agreements')}>
                        {t('text.admin.legalAgreementsDpabaa', 'Legal Agreements (DPA/BAA)')}
                      </Button>
                      <Button onClick={() => navigate('/legal/subprocessors')}>
                        {t('text.admin.subprocessorTransparency', 'Subprocessor Transparency')}
                      </Button>
                      <Button onClick={() => navigate('/admin/compliance/data-classification')}>
                        {t('text.admin.dataClassification', 'Data Classification')}
                      </Button>
                      <Button onClick={() => navigate('/admin/compliance/audit-rights')}>
                        {t('text.admin.auditRightsTracking', 'Audit Rights Tracking')}
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
                    <CardTitle>{t('text.admin.supportManagement', 'Support Management')}</CardTitle>
                    <CardDescription>{t('text.admin.manageSupportTicketsCsmAssignmentsAnd', 'Manage support tickets, CSM assignments, and knowledge base')}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-3 gap-4">
                      <Button onClick={() => navigate('/admin/support/queue')}>
                        {t('text.admin.supportQueue', 'Support Queue')}
                      </Button>
                      <Button onClick={() => navigate('/admin/csm/assignments')}>
                        {t('text.admin.csmAssignments', 'CSM Assignments')}
                      </Button>
                      <Button onClick={() => navigate('/admin/kb/articles')}>
                        {t('text.admin.kbArticlesManager', 'KB Articles Manager')}
                      </Button>
                      <Button onClick={() => navigate('/admin/status')}>
                        {t('text.admin.statusPage', 'Status Page')}
                      </Button>
                      <Button onClick={() => navigate('/support/tickets')}>
                        {t('text.admin.viewAllTickets', 'View All Tickets')}
                      </Button>
                      <Button onClick={() => navigate('/help')}>
                        {t('text.admin.knowledgeBase', 'Knowledge Base')}
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
                  <CardTitle>{t('text.admin.disasterRecovery', 'Disaster Recovery')}</CardTitle>
                  <CardDescription>{t('text.admin.comprehensiveDisasterRecoveryDashboardAndTools', 'Comprehensive disaster recovery dashboard and tools')}</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Button
                    onClick={() => navigate('/admin/dr-comprehensive')}
                    className="w-full"
                    size="lg"
                  >
                    {t('text.admin.openComprehensiveDrDashboard', 'Open Comprehensive DR Dashboard')}
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
