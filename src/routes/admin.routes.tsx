import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

// Admin Pages
const Admin = lazy(() => import("@/pages/Admin"));
const AdminCandidates = lazy(() => import("@/pages/AdminCandidates"));
const AssessmentsHub = lazy(() => import("@/pages/admin/AssessmentsHub"));
const MergeDashboard = lazy(() => import("@/pages/admin/MergeDashboard"));
const ClubSyncRequestsPage = lazy(() => import("@/pages/admin/ClubSyncRequestsPage"));
const AIConfiguration = lazy(() => import("@/pages/admin/AIConfiguration"));
const GlobalAnalytics = lazy(() => import("@/pages/admin/GlobalAnalytics"));
const TranslationManager = lazy(() => import("@/pages/admin/TranslationManager"));
const LanguageManager = lazy(() => import("@/pages/admin/LanguageManager"));
const DisasterRecoveryPage = lazy(() => import("@/pages/admin/DisasterRecoveryPage"));
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
const StrategistProjectsDashboard = lazy(() => import("@/pages/admin/StrategistProjectsDashboard"));
const MarketplaceAnalytics = lazy(() => import("@/pages/admin/MarketplaceAnalytics"));
const ExpenseTrackingPage = lazy(() => import("@/pages/admin/ExpenseTracking"));
const ClosedJobs = lazy(() => import("@/pages/admin/ClosedJobs"));

// Enterprise Management
const EnterpriseDashboard = lazy(() => import("@/pages/admin/EnterpriseDashboard"));
const DueDiligenceDashboard = lazy(() => import("@/pages/admin/DueDiligenceDashboard"));
const RiskManagementDashboard = lazy(() => import("@/pages/admin/RiskManagementDashboard"));

// Phase 5: Analytics Dashboards
const JobAnalyticsDashboard = lazy(() => import("@/pages/admin/JobAnalyticsDashboard"));
const ConversationAnalytics = lazy(() => import("@/pages/admin/ConversationAnalytics"));
const SecurityEventDashboard = lazy(() => import("@/pages/admin/SecurityEventDashboard"));
const UserEngagementDashboard = lazy(() => import("@/pages/admin/UserEngagementDashboard"));
const IntelligenceCenter = lazy(() => import("@/pages/admin/IntelligenceCenter"));
const AgentBrain = lazy(() => import("@/pages/admin/AgentBrain"));

// Operations Pages
const GodMode = lazy(() => import("@/pages/admin/GodMode"));
const ErrorLogs = lazy(() => import("@/pages/admin/ErrorLogs"));
const JobAnalyticsIndex = lazy(() => import("@/pages/admin/JobAnalyticsIndex"));
const DataHealthPage = lazy(() => import("@/pages/admin/DataHealthPage"));

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

// Talent Pool
const TalentPool = lazy(() => import("@/pages/TalentPool"));
const TalentPoolLists = lazy(() => import("@/pages/TalentPoolLists"));
const TalentPoolListDetail = lazy(() => import("@/pages/TalentPoolListDetail"));

// Archived/Legacy
const ArchivedCandidates = lazy(() => import("@/pages/ArchivedCandidates"));

// === NEW CONSOLIDATED HUB PAGES ===
const TalentHub = lazy(() => import("@/pages/admin/TalentHub"));
const OpsCenter = lazy(() => import("@/pages/admin/OpsCenter"));
const ComplianceHub = lazy(() => import("@/pages/admin/ComplianceHub"));
const TranslationHub = lazy(() => import("@/pages/admin/TranslationHub"));
const InventoryHub = lazy(() => import("@/pages/admin/InventoryHub"));
const ProjectsHub = lazy(() => import("@/pages/ProjectsHub"));

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
      path="/talent-pool"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <TalentPool />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/talent-pool/lists"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <TalentPoolLists />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/talent-pool/lists/:listId"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <TalentPoolListDetail />
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
      path="/admin/data-health"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <DataHealthPage />
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
      element={<Navigate to="/admin/financial?tab=sales-kpis" replace />}
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
    <Route path="/admin/job-analytics" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><JobAnalyticsIndex /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/admin/conversation-analytics" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ConversationAnalytics /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/admin/security-events" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><SecurityEventDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/admin/user-engagement" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><UserEngagementDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />

    {/* Missing Operations Routes */}
    <Route path="/admin/god-mode" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><GodMode /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/admin/error-logs" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ErrorLogs /></Suspense></RouteErrorBoundary></ProtectedRoute>} />

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

    {/* Due Diligence Center */}
    <Route path="/admin/due-diligence" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><DueDiligenceDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />

    {/* Risk & Scale Management */}
    <Route path="/admin/risk-management" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><RiskManagementDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />

    {/* Marketplace Strategist Dashboard */}
    <Route path="/admin/marketplace/strategist" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><StrategistProjectsDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />

    {/* Marketplace Analytics */}
    <Route path="/admin/marketplace/analytics" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><MarketplaceAnalytics /></Suspense></RouteErrorBoundary></ProtectedRoute>} />

    {/* Agent Brain */}
    <Route path="/admin/agent-brain" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><AgentBrain /></Suspense></RouteErrorBoundary></ProtectedRoute>} />

    {/* Archived Candidates */}
    <Route path="/archived-candidates" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ArchivedCandidates /></Suspense></RouteErrorBoundary></ProtectedRoute>} />

    {/* Intelligence Center - Unified analytics hub */}
    <Route path="/admin/intelligence" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><IntelligenceCenter /></Suspense></RouteErrorBoundary></ProtectedRoute>} />

    {/* Redirects for consolidated intelligence pages */}
    <Route path="/admin/global-analytics" element={<Navigate to="/admin/intelligence?tab=overview" replace />} />
    <Route path="/ml-dashboard" element={<Navigate to="/admin/intelligence?tab=ml" replace />} />
    <Route path="/hiring-intelligence" element={<Navigate to="/admin/intelligence?tab=hiring" replace />} />
    <Route path="/funnel-analytics" element={<Navigate to="/admin/intelligence?tab=funnel" replace />} />
    <Route path="/communication-analytics" element={<Navigate to="/admin/intelligence?tab=communication" replace />} />
    <Route path="/messaging-analytics" element={<Navigate to="/admin/intelligence?tab=communication" replace />} />

    {/* === NEW CONSOLIDATED HUB ROUTES === */}
    <Route path="/admin/talent-hub" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><TalentHub /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/admin/ops-center" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><OpsCenter /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/admin/compliance-hub" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ComplianceHub /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/admin/translation-hub" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><TranslationHub /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/admin/inventory-hub" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><InventoryHub /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/projects-hub" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ProjectsHub /></Suspense></RouteErrorBoundary></ProtectedRoute>} />

    {/* === REDIRECTS FOR CONSOLIDATED PAGES === */}
    {/* Talent Hub redirects */}
    <Route path="/admin/talent-pool/lists" element={<Navigate to="/admin/talent-hub?tab=lists" replace />} />
    <Route path="/admin/candidates" element={<Navigate to="/admin/talent-hub?tab=candidates" replace />} />
    <Route path="/admin/target-companies" element={<Navigate to="/admin/talent-hub?tab=targets" replace />} />
    <Route path="/admin/merge" element={<Navigate to="/admin/talent-hub?tab=merge" replace />} />
    <Route path="/admin/rejections" element={<Navigate to="/admin/talent-hub?tab=rejections" replace />} />
    <Route path="/archived-candidates" element={<Navigate to="/admin/talent-hub?tab=archived" replace />} />

    {/* Ops Center redirects */}
    <Route path="/admin/kpi-command-center" element={<Navigate to="/admin/ops-center?tab=kpi" replace />} />
    <Route path="/admin/employee-management" element={<Navigate to="/admin/ops-center?tab=employees" replace />} />
    <Route path="/admin/system-health" element={<Navigate to="/admin/ops-center?tab=health" replace />} />
    <Route path="/admin/bulk-operations" element={<Navigate to="/admin/ops-center?tab=bulk" replace />} />
    <Route path="/admin/security-events" element={<Navigate to="/admin/ops-center?tab=security" replace />} />
    <Route path="/admin/anti-hacking" element={<Navigate to="/admin/ops-center?tab=anti-hacking" replace />} />
    <Route path="/admin/audit-log" element={<Navigate to="/admin/ops-center?tab=audit" replace />} />
    <Route path="/admin/error-logs" element={<Navigate to="/admin/ops-center?tab=errors" replace />} />
    <Route path="/admin/god-mode" element={<Navigate to="/admin/ops-center?tab=god-mode" replace />} />
    <Route path="/admin/disaster-recovery" element={<Navigate to="/admin/ops-center?tab=disaster" replace />} />

    {/* Compliance Hub redirects */}
    <Route path="/compliance/dashboard" element={<Navigate to="/admin/compliance-hub?tab=overview" replace />} />
    <Route path="/admin/risk-management" element={<Navigate to="/admin/compliance-hub?tab=risk" replace />} />
    <Route path="/compliance/legal-agreements" element={<Navigate to="/admin/compliance-hub?tab=legal" replace />} />
    <Route path="/compliance/subprocessors" element={<Navigate to="/admin/compliance-hub?tab=subprocessors" replace />} />
    <Route path="/compliance/data-classification" element={<Navigate to="/admin/compliance-hub?tab=data" replace />} />
    <Route path="/compliance/audit-requests" element={<Navigate to="/admin/compliance-hub?tab=audits" replace />} />

    {/* Translation Hub redirects */}
    <Route path="/admin/translations" element={<Navigate to="/admin/translation-hub?tab=overview" replace />} />
    <Route path="/admin/translation-editor" element={<Navigate to="/admin/translation-hub?tab=editor" replace />} />
    <Route path="/admin/translation-coverage" element={<Navigate to="/admin/translation-hub?tab=coverage" replace />} />
    <Route path="/admin/brand-terms" element={<Navigate to="/admin/translation-hub?tab=brand" replace />} />
    <Route path="/admin/translation-audit" element={<Navigate to="/admin/translation-hub?tab=audit" replace />} />
    <Route path="/admin/languages" element={<Navigate to="/admin/translation-hub?tab=languages" replace />} />

    {/* Inventory Hub redirects */}
    <Route path="/admin/inventory/dashboard" element={<Navigate to="/admin/inventory-hub?tab=overview" replace />} />
    <Route path="/admin/inventory" element={<Navigate to="/admin/inventory-hub?tab=assets" replace />} />
    <Route path="/admin/inventory/depreciation" element={<Navigate to="/admin/inventory-hub?tab=depreciation" replace />} />
    <Route path="/admin/inventory/intangible" element={<Navigate to="/admin/inventory-hub?tab=intangible" replace />} />
    <Route path="/admin/inventory/kia" element={<Navigate to="/admin/inventory-hub?tab=kia" replace />} />

    {/* Projects Hub redirects */}
    <Route path="/projects/freelancer/setup" element={<Navigate to="/projects-hub?tab=setup" replace />} />
    <Route path="/projects/gigs" element={<Navigate to="/projects-hub?tab=gigs" replace />} />
    <Route path="/projects/proposals" element={<Navigate to="/projects-hub?tab=proposals" replace />} />
    <Route path="/time-tracking" element={<Navigate to="/projects-hub?tab=time" replace />} />
  </>
);
