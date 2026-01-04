import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

// Admin Pages
const Admin = lazy(() => import("@/pages/Admin"));
const AdminCandidates = lazy(() => import("@/pages/AdminCandidates"));
const AssessmentsHub = lazy(() => import("@/pages/admin/AssessmentsHub"));
const MergeDashboard = lazy(() => import("@/pages/admin/MergeDashboard"));
const ClubSyncRequestsPage = lazy(() => import("@/pages/admin/ClubSyncRequestsPage"));
// CompanyManagement removed - consolidated into /companies page
const GlobalAnalytics = lazy(() => import("@/pages/admin/GlobalAnalytics"));
const AIConfiguration = lazy(() => import("@/pages/admin/AIConfiguration"));
const TranslationManager = lazy(() => import("@/pages/admin/TranslationManager"));
const LanguageManager = lazy(() => import("@/pages/admin/LanguageManager"));
const DisasterRecoveryPage = lazy(() => import("@/pages/admin/DisasterRecoveryPage"));
// DRRunbooks and ComprehensiveDRPage consolidated into DisasterRecoveryPage
const MemberRequestsPage = lazy(() => import("@/pages/admin/MemberRequestsPage"));
const EmailTemplateManager = lazy(() => import("@/pages/admin/EmailTemplateManager"));
const TargetCompaniesOverview = lazy(() => import("@/pages/admin/TargetCompaniesOverview"));
const AdminRejections = lazy(() => import("@/pages/AdminRejections"));
const FeedbackDatabase = lazy(() => import("@/pages/FeedbackDatabase"));
const UserActivity = lazy(() => import("@/pages/admin/UserActivity"));
const SystemHealth = lazy(() => import("@/pages/admin/SystemHealth"));
const QuantumPerformanceMatrixPage = lazy(() => import("@/pages/QuantumPerformanceMatrixPage"));
const WebsiteKPIDashboardPage = lazy(() => import("@/pages/WebsiteKPIDashboardPage"));
const SalesKPIDashboardPage = lazy(() => import("@/pages/SalesKPIDashboardPage"));
const UnifiedKPICommandCenterPage = lazy(() => import("@/pages/UnifiedKPICommandCenterPage"));
const CompanyFeeConfiguration = lazy(() => import("@/pages/admin/CompanyFeeConfiguration"));
const DealPipelineSettings = lazy(() => import("@/pages/admin/DealPipelineSettings"));
const MoneybirdSettings = lazy(() => import("@/pages/admin/MoneybirdSettings"));
const AntiHacking = lazy(() => import("@/pages/admin/AntiHacking"));
const AdminAuditLog = lazy(() => import("@/pages/admin/AdminAuditLog"));
// AdminEmployees removed - consolidated into EmployeeManagement
const EmployeeDetailPage = lazy(() => import("@/pages/admin/EmployeeDetailPage"));
const EmployeeManagement = lazy(() => import("@/pages/admin/EmployeeManagement"));
const MyPerformance = lazy(() => import("@/pages/MyPerformance"));
const TeamPerformance = lazy(() => import("@/pages/TeamPerformance"));
const TranslationEditor = lazy(() => import("@/pages/admin/TranslationEditor"));
const TranslationCoverage = lazy(() => import("@/pages/admin/TranslationCoverage"));
const BrandTermManager = lazy(() => import("@/pages/admin/BrandTermManager"));
const TranslationAuditLog = lazy(() => import("@/pages/admin/TranslationAuditLog"));
const TemplateManagement = lazy(() => import("@/pages/admin/TemplateManagement"));
const WhatsAppAnalytics = lazy(() => import("@/pages/admin/WhatsAppAnalytics"));
const WhatsAppSettings = lazy(() => import("@/pages/admin/WhatsAppSettings"));
const CompanyRelationships = lazy(() => import("@/pages/admin/CompanyRelationships"));
const RevenueSharesPage = lazy(() => import("@/pages/admin/RevenueShares"));
const InvoiceReconciliationPage = lazy(() => import("@/pages/admin/InvoiceReconciliation"));
const ExpenseTrackingPage = lazy(() => import("@/pages/admin/ExpenseTracking"));
const ClosedJobs = lazy(() => import("@/pages/admin/ClosedJobs"));

// Enterprise Management
const EnterpriseDashboard = lazy(() => import("@/pages/admin/EnterpriseDashboard"));

// Phase 5: Analytics Dashboards
const JobAnalyticsDashboard = lazy(() => import("@/pages/admin/JobAnalyticsDashboard"));
const ConversationAnalytics = lazy(() => import("@/pages/admin/ConversationAnalytics"));
const SecurityEventDashboard = lazy(() => import("@/pages/admin/SecurityEventDashboard"));
const UserEngagementDashboard = lazy(() => import("@/pages/admin/UserEngagementDashboard"));

// Inventory Pages
const AssetRegister = lazy(() => import("@/pages/admin/inventory/AssetRegister"));
const InventoryDashboard = lazy(() => import("@/pages/admin/inventory/InventoryDashboard"));
const DepreciationSchedule = lazy(() => import("@/pages/admin/inventory/DepreciationSchedule"));
const IntangibleAssets = lazy(() => import("@/pages/admin/inventory/IntangibleAssets"));
const KIAOptimization = lazy(() => import("@/pages/admin/inventory/KIAOptimization"));

// Bulk Operations
const BulkOperationsHub = lazy(() => import("@/pages/admin/BulkOperationsHub"));

// Game Admin Pages
const ValuesPokerAdmin = lazy(() => import("@/pages/admin/games/ValuesPokerAdmin"));
const SwipeGameAdmin = lazy(() => import("@/pages/admin/games/SwipeGameAdmin"));
const PressureCookerAdmin = lazy(() => import("@/pages/admin/games/PressureCookerAdmin"));
const BlindSpotAdmin = lazy(() => import("@/pages/admin/games/BlindSpotAdmin"));
const MiljoenenjachtAdmin = lazy(() => import("@/pages/admin/games/MiljoenenjachtAdmin"));

export const adminRoutes = (
  <>
    <Route
      path="/admin"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Admin />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/candidates"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <AdminCandidates />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/assessments"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <AssessmentsHub />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/merge"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <MergeDashboard />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/club-sync-requests"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ClubSyncRequestsPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    {/* Company Management consolidated into /companies page */}
    <Route
      path="/admin/global-analytics"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <GlobalAnalytics />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/ai-configuration"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <AIConfiguration />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/translations"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <TranslationManager />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/languages"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <LanguageManager />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/disaster-recovery"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <DisasterRecoveryPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    {/* /admin/dr-runbooks and /admin/comprehensive-dr consolidated into /admin/disaster-recovery */}
    <Route
      path="/admin/member-requests"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <MemberRequestsPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/email-templates"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <EmailTemplateManager />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/target-companies"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <TargetCompaniesOverview />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/rejections"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <AdminRejections />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/feedback"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <FeedbackDatabase />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/user-activity"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <UserActivity />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/system-health"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <SystemHealth />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/performance-matrix"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <QuantumPerformanceMatrixPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/website-kpis"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <WebsiteKPIDashboardPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/sales-kpis"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <SalesKPIDashboardPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/kpi-command-center"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <UnifiedKPICommandCenterPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/company-fees"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CompanyFeeConfiguration />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/deal-pipeline-settings"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <DealPipelineSettings />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/moneybird"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <MoneybirdSettings />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/anti-hacking"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <AntiHacking />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/audit-log"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <AdminAuditLog />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    {/* /admin/employees consolidated into /admin/employee-management */}
    <Route
      path="/admin/employees/:employeeId"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <EmployeeDetailPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/employee-management"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <EmployeeManagement />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/my-performance"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <MyPerformance />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/team-performance"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <TeamPerformance />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/translation-editor"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <TranslationEditor />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/translation-coverage"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <TranslationCoverage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/brand-terms"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <BrandTermManager />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/translation-audit"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <TranslationAuditLog />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/templates"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <TemplateManagement />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/whatsapp-analytics"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <WhatsAppAnalytics />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/whatsapp-settings"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <WhatsAppSettings />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/company-relationships"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CompanyRelationships />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/games/values-poker"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ValuesPokerAdmin />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/games/swipe-game"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <SwipeGameAdmin />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/games/pressure-cooker"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PressureCookerAdmin />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/games/blind-spot"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <BlindSpotAdmin />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/games/miljoenenjacht"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <MiljoenenjachtAdmin />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    {/* Inventory Routes */}
    <Route path="/admin/inventory" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><AssetRegister /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/admin/inventory/dashboard" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><InventoryDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/admin/inventory/depreciation" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><DepreciationSchedule /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/admin/inventory/intangible" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><IntangibleAssets /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/admin/inventory/kia" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><KIAOptimization /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/admin/bulk-operations" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><BulkOperationsHub /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    
    {/* Phase 5: Analytics Dashboards */}
    <Route path="/admin/jobs/:jobId/analytics" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><JobAnalyticsDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/admin/conversation-analytics" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ConversationAnalytics /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/admin/security-events" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><SecurityEventDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/admin/user-engagement" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><UserEngagementDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    
    {/* Revenue Shares */}
    <Route path="/admin/revenue-shares" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><RevenueSharesPage /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    
    {/* Invoice Reconciliation */}
    <Route path="/admin/reconciliation" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><InvoiceReconciliationPage /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    
    {/* Expense Tracking */}
    <Route path="/admin/expenses" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ExpenseTrackingPage /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    
    {/* Closed Jobs */}
    <Route path="/admin/closed-jobs" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ClosedJobs /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    
    {/* Enterprise Management */}
    <Route path="/admin/enterprise" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><EnterpriseDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
  </>
);
