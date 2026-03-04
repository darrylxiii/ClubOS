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
const FocusView = lazy(() => import("@/pages/crm/FocusView"));
const CRMAnalytics = lazy(() => import("@/pages/crm/CRMAnalytics"));
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
    <Route path="/crm/focus" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><FocusView /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/analytics" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><CRMAnalytics /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/settings" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><CRMSettings /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    <Route path="/crm/sequences" element={<ProtectedRoute><RouteErrorBoundary><Suspense fallback={<PageLoader />}><EmailSequencingHub /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
    {/* Redirects for consolidated routes — now tabs inside CRM Settings */}
    <Route path="/crm/imports" element={<Navigate to="/crm/settings?tab=imports" replace />} />
    <Route path="/crm/suppression" element={<Navigate to="/crm/settings?tab=suppression" replace />} />
    <Route path="/crm/lead-scoring" element={<Navigate to="/crm/settings?tab=lead-scoring" replace />} />
    <Route path="/crm/automations" element={<Navigate to="/crm/settings?tab=automations" replace />} />
    <Route path="/crm/audit-trail" element={<Navigate to="/crm/settings?tab=audit-trail" replace />} />
    <Route path="/crm/integrations" element={<Navigate to="/crm/settings?tab=integrations" replace />} />
    {/* Redirect old route */}
    <Route path="/email-sequences" element={<Navigate to="/crm/sequences" replace />} />
  </>
);
