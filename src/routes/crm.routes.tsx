import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

// CRM Pages
const CRMDashboard = lazy(() => import("@/pages/crm/CRMDashboard"));
const ProspectPipeline = lazy(() => import("@/pages/crm/ProspectPipeline"));
const ProspectDetail = lazy(() => import("@/pages/crm/ProspectDetail"));
const ReplyInbox = lazy(() => import("@/pages/crm/ReplyInbox"));
const CampaignDashboard = lazy(() => import("@/pages/crm/CampaignDashboard"));
const ImportHistory = lazy(() => import("@/pages/crm/ImportHistory"));
const SuppressionList = lazy(() => import("@/pages/crm/SuppressionList"));
const FocusView = lazy(() => import("@/pages/crm/FocusView"));
const CRMAnalytics = lazy(() => import("@/pages/crm/CRMAnalytics"));
const LeadScoringConfig = lazy(() => import("@/pages/crm/LeadScoringConfig"));
const CRMAutomations = lazy(() => import("@/pages/crm/CRMAutomations"));
const ProspectAuditTrail = lazy(() => import("@/pages/crm/ProspectAuditTrail"));
const CRMIntegrations = lazy(() => import("@/pages/crm/CRMIntegrations"));
const CRMSettings = lazy(() => import("@/pages/crm/CRMSettings"));
const EmailSequencingHub = lazy(() => import("@/pages/crm/EmailSequencingHub"));

export const crmRoutes = (
  <>
    <Route path="/crm" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><CRMDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/pipeline" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ProspectPipeline /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/prospects" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ProspectPipeline /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/prospects/:prospectId" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ProspectDetail /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/inbox" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ReplyInbox /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/campaigns" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><CampaignDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/imports" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ImportHistory /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/suppression" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><SuppressionList /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/focus" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><FocusView /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/analytics" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><CRMAnalytics /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/lead-scoring" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><LeadScoringConfig /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/automations" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><CRMAutomations /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/audit-trail" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ProspectAuditTrail /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/integrations" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><CRMIntegrations /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/settings" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><CRMSettings /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/email-sequences" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><EmailSequencingHub /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
  </>
);