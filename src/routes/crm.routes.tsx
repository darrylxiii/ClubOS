import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
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
const CRMAnalytics = lazy(() => import("@/pages/crm/CRMAnalytics"));
const LeadScoringConfig = lazy(() => import("@/pages/crm/LeadScoringConfig"));
const ProspectAuditTrail = lazy(() => import("@/pages/crm/ProspectAuditTrail"));
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
    <Route path="/crm/analytics" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><CRMAnalytics /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/lead-scoring" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><LeadScoringConfig /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/audit-trail" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><ProspectAuditTrail /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/settings" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><CRMSettings /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/email-sequences" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><EmailSequencingHub /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    
    {/* Redirects for consolidated pages */}
    <Route path="/crm/focus" element={<Navigate to="/crm?tab=focus" replace />} />
    <Route path="/crm/automations" element={<Navigate to="/crm?tab=automations" replace />} />
    <Route path="/crm/integrations" element={<Navigate to="/crm?tab=integrations" replace />} />
  </>
);