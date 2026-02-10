import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

// ──────────────────────────────────────────────
// Admin Core Pages
// ──────────────────────────────────────────────
const Admin = lazy(() => import("@/pages/Admin"));
const AdminCandidates = lazy(() => import("@/pages/AdminCandidates"));

// ──────────────────────────────────────────────
// Hub Pages (consolidated)
// ──────────────────────────────────────────────
const TranslationsHub = lazy(() => import("@/pages/admin/TranslationsHub"));
const SecurityHub = lazy(() => import("@/pages/admin/SecurityHub"));
const CommunicationHub = lazy(() => import("@/pages/admin/CommunicationHub"));
const EngagementHub = lazy(() => import("@/pages/admin/EngagementHub"));
const PerformanceHub = lazy(() => import("@/pages/admin/PerformanceHub"));
const AssessmentsHub = lazy(() => import("@/pages/admin/AssessmentsHub"));
const TalentHub = lazy(() => import("@/pages/admin/TalentHub"));

// ──────────────────────────────────────────────
// Standalone Admin Pages
// ──────────────────────────────────────────────
const GlobalAnalytics = lazy(() => import("@/pages/admin/GlobalAnalytics"));
const AIConfiguration = lazy(() => import("@/pages/admin/AIConfiguration"));

const SystemHealth = lazy(() => import("@/pages/admin/SystemHealth"));
const DataHealthPage = lazy(() => import("@/pages/admin/DataHealthPage"));
const UnifiedKPICommandCenterPage = lazy(() => import("@/pages/UnifiedKPICommandCenterPage"));
const TargetCompaniesOverview = lazy(() => import("@/pages/admin/TargetCompaniesOverview"));
const EmployeeDetailPage = lazy(() => import("@/pages/admin/EmployeeDetailPage"));
const EmployeeManagement = lazy(() => import("@/pages/admin/EmployeeManagement"));
const MyPerformance = lazy(() => import("@/pages/MyPerformance"));
const TemplateManagement = lazy(() => import("@/pages/admin/TemplateManagement"));
const WhatsAppHub = lazy(() => import("@/pages/admin/WhatsAppHub"));
const WhatsAppBookingPage = lazy(() => import("@/pages/admin/WhatsAppBookingPage"));
const CompanyRelationships = lazy(() => import("@/pages/admin/CompanyRelationships"));
const ClosedJobs = lazy(() => import("@/pages/admin/ClosedJobs"));
const AdminExports = lazy(() => import("@/pages/admin/AdminExports"));
const StrategistProjectsDashboard = lazy(() => import("@/pages/admin/StrategistProjectsDashboard"));
const MarketplaceAnalytics = lazy(() => import("@/pages/admin/MarketplaceAnalytics"));
const InventoryHub = lazy(() => import("@/pages/admin/InventoryHub"));
const BulkOperationsHub = lazy(() => import("@/pages/admin/BulkOperationsHub"));

// Enterprise Management
const EnterpriseDashboard = lazy(() => import("@/pages/admin/EnterpriseDashboard"));
const DueDiligenceDashboard = lazy(() => import("@/pages/admin/DueDiligenceDashboard"));
const RiskManagementDashboard = lazy(() => import("@/pages/admin/RiskManagementDashboard"));

// Analytics Dashboards
const JobAnalyticsDashboard = lazy(() => import("@/pages/admin/JobAnalyticsDashboard"));
const JobAnalyticsIndex = lazy(() => import("@/pages/admin/JobAnalyticsIndex"));

// Agent Brain
const AgentBrain = lazy(() => import("@/pages/admin/AgentBrain"));
const RAGAnalyticsDashboard = lazy(() => import("@/pages/admin/RAGAnalyticsDashboard"));

// Talent Pool
const TalentPool = lazy(() => import("@/pages/TalentPool"));
const TalentPoolLists = lazy(() => import("@/pages/TalentPoolLists"));
const TalentPoolListDetail = lazy(() => import("@/pages/TalentPoolListDetail"));

// Helper to wrap routes consistently
const R = (path: string, Component: React.LazyExoticComponent<any>) => (
  <Route
    path={path}
    element={
      <ProtectedRoute>
        <RouteErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Component />
          </Suspense>
        </RouteErrorBoundary>
      </ProtectedRoute>
    }
  />
);

export const adminRoutes = (
  <>
    {/* ════════════════════════════════════════════ */}
    {/* HUB ROUTES                                  */}
    {/* ════════════════════════════════════════════ */}
    {R("/admin", Admin)}
    {R("/admin/translations", TranslationsHub)}
    {R("/admin/security", SecurityHub)}
    {R("/admin/communication-hub", CommunicationHub)}
    {R("/admin/engagement-hub", EngagementHub)}
    {R("/admin/performance-hub", PerformanceHub)}
    {R("/admin/assessments", AssessmentsHub)}
    {R("/admin/talent-hub", TalentHub)}

    {/* ════════════════════════════════════════════ */}
    {/* STANDALONE ROUTES                            */}
    {/* ════════════════════════════════════════════ */}
    {R("/admin/candidates", AdminCandidates)}
    {R("/admin/global-analytics", GlobalAnalytics)}
    {R("/admin/ai-configuration", AIConfiguration)}
    
    {R("/admin/system-health", SystemHealth)}
    {R("/admin/data-health", DataHealthPage)}
    {/* KPI routes redirect to unified command center */}
    <Route path="/admin/website-kpis" element={<Navigate to="/admin/kpi-command-center" replace />} />
    <Route path="/admin/sales-kpis" element={<Navigate to="/admin/kpi-command-center" replace />} />
    {R("/admin/kpi-command-center", UnifiedKPICommandCenterPage)}
    {R("/admin/employees/:employeeId", EmployeeDetailPage)}
    {R("/admin/employee-management", EmployeeManagement)}
    {R("/my-performance", MyPerformance)}
    {R("/admin/templates", TemplateManagement)}
    {R("/admin/company-relationships", CompanyRelationships)}
    {R("/admin/closed-jobs", ClosedJobs)}
    {R("/admin/exports", AdminExports)}
    {R("/admin/whatsapp-booking", WhatsAppBookingPage)}
    {R("/admin/marketplace/strategist", StrategistProjectsDashboard)}
    {R("/admin/marketplace/analytics", MarketplaceAnalytics)}
    {R("/admin/inventory", InventoryHub)}
    {R("/admin/bulk-operations", BulkOperationsHub)}
    {R("/admin/enterprise", EnterpriseDashboard)}
    {R("/admin/due-diligence", DueDiligenceDashboard)}
    {R("/admin/risk-management", RiskManagementDashboard)}
    {R("/admin/jobs/:jobId/analytics", JobAnalyticsDashboard)}
    {R("/admin/job-analytics", JobAnalyticsIndex)}
    {R("/admin/agent-brain", AgentBrain)}
    {R("/admin/rag-analytics", RAGAnalyticsDashboard)}
    {R("/talent-pool", TalentPool)}
    {R("/admin/talent-pool/lists", TalentPoolLists)}
    {R("/admin/talent-pool/lists/:listId", TalentPoolListDetail)}

    {/* WhatsApp Hub (multi-route) */}
    {R("/admin/whatsapp", WhatsAppHub)}
    {R("/admin/whatsapp/analytics", WhatsAppHub)}
    {R("/admin/whatsapp/campaigns", WhatsAppHub)}
    {R("/admin/whatsapp/automations", WhatsAppHub)}
    {R("/admin/whatsapp/import", WhatsAppHub)}
    {R("/admin/whatsapp/settings", WhatsAppHub)}

    {/* ════════════════════════════════════════════ */}
    {/* LEGACY REDIRECTS                             */}
    {/* ════════════════════════════════════════════ */}

    {/* Translations Hub */}
    <Route path="/admin/languages" element={<Navigate to="/admin/translations?tab=languages" replace />} />
    <Route path="/admin/translation-editor" element={<Navigate to="/admin/translations?tab=editor" replace />} />
    <Route path="/admin/translation-coverage" element={<Navigate to="/admin/translations?tab=coverage" replace />} />
    <Route path="/admin/brand-terms" element={<Navigate to="/admin/translations?tab=brand-terms" replace />} />
    <Route path="/admin/translation-audit" element={<Navigate to="/admin/translations?tab=audit" replace />} />

    {/* Security Hub */}
    <Route path="/admin/anti-hacking" element={<Navigate to="/admin/security" replace />} />
    <Route path="/admin/audit-log" element={<Navigate to="/admin/security?tab=audit-log" replace />} />
    <Route path="/admin/disaster-recovery" element={<Navigate to="/admin/security?tab=disaster-recovery" replace />} />
    <Route path="/admin/security-events" element={<Navigate to="/admin/security?tab=events" replace />} />
    <Route path="/admin/god-mode" element={<Navigate to="/admin/security?tab=god-mode" replace />} />
    <Route path="/admin/error-logs" element={<Navigate to="/admin/security?tab=error-logs" replace />} />

    {/* Finance Hub */}
    <Route path="/admin/revenue-ladder" element={<Navigate to="/admin/finance?tab=revenue-ladder" replace />} />
    <Route path="/admin/company-fees" element={<Navigate to="/admin/finance?tab=fees" replace />} />
    <Route path="/admin/deal-pipeline-settings" element={<Navigate to="/admin/finance?tab=pipeline-settings" replace />} />
    <Route path="/admin/moneybird" element={<Navigate to="/admin/finance?tab=moneybird" replace />} />
    <Route path="/admin/revenue-shares" element={<Navigate to="/admin/finance?tab=revenue-shares" replace />} />
    <Route path="/admin/reconciliation" element={<Navigate to="/admin/finance?tab=reconciliation" replace />} />
    <Route path="/admin/expenses" element={<Navigate to="/admin/finance?tab=expenses" replace />} />

    {/* Communication Hub */}
    <Route path="/admin/conversation-analytics" element={<Navigate to="/admin/communication-hub?tab=conversations" replace />} />
    <Route path="/admin/feedback" element={<Navigate to="/admin/communication-hub?tab=feedback" replace />} />

    {/* Engagement Hub */}
    <Route path="/admin/user-engagement" element={<Navigate to="/admin/engagement-hub?tab=engagement" replace />} />

    {/* Performance Hub */}
    <Route path="/admin/performance-matrix" element={<Navigate to="/admin/performance-hub?tab=matrix" replace />} />
    <Route path="/team-performance" element={<Navigate to="/admin/performance-hub?tab=team" replace />} />
    <Route path="/admin/user-activity" element={<Navigate to="/admin/performance-hub?tab=activity" replace />} />

    {/* Assessments Hub */}
    <Route path="/admin/games/values-poker" element={<Navigate to="/admin/assessments-hub?tab=values-poker" replace />} />
    <Route path="/admin/games/swipe-game" element={<Navigate to="/admin/assessments-hub?tab=swipe-game" replace />} />
    <Route path="/admin/games/pressure-cooker" element={<Navigate to="/admin/assessments-hub?tab=pressure-cooker" replace />} />
    <Route path="/admin/games/blind-spot" element={<Navigate to="/admin/assessments-hub?tab=blind-spot" replace />} />
    <Route path="/admin/games/miljoenenjacht" element={<Navigate to="/admin/assessments-hub?tab=miljoenenjacht" replace />} />
    <Route path="/admin/assessments" element={<Navigate to="/admin/assessments-hub" replace />} />

    {/* Talent Hub */}
    <Route path="/admin/member-requests" element={<Navigate to="/admin/talent-hub" replace />} />
    <Route path="/admin/merge" element={<Navigate to="/admin/talent-hub?tab=merge" replace />} />
    <Route path="/archived-candidates" element={<Navigate to="/admin/talent-hub?tab=archived" replace />} />
    <Route path="/admin/club-sync-requests" element={<Navigate to="/admin/talent-hub?tab=sync" replace />} />
    <Route path="/admin/rejections" element={<Navigate to="/admin/talent-hub?tab=rejections" replace />} />
    <Route path="/admin/email-templates" element={<Navigate to="/admin/talent-hub?tab=emails" replace />} />

    {/* Inventory Hub */}
    <Route path="/admin/inventory/dashboard" element={<Navigate to="/admin/inventory" replace />} />
    <Route path="/admin/inventory/depreciation" element={<Navigate to="/admin/inventory?tab=depreciation" replace />} />
    <Route path="/admin/inventory/intangible" element={<Navigate to="/admin/inventory?tab=intangible" replace />} />
    <Route path="/admin/inventory/kia" element={<Navigate to="/admin/inventory?tab=kia" replace />} />

    {/* WhatsApp */}
    <Route path="/admin/whatsapp-analytics" element={<Navigate to="/admin/whatsapp/analytics" replace />} />
    <Route path="/admin/whatsapp-settings" element={<Navigate to="/admin/whatsapp/settings" replace />} />

    {/* Misc */}
    <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
  </>
);
