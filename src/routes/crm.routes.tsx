import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-12 h-12 animate-spin text-primary" />
  </div>
);

// CRM Pages
const CRMDashboard = lazy(() => import("@/pages/crm/CRMDashboard"));
const ProspectPipeline = lazy(() => import("@/pages/crm/ProspectPipeline"));
const ProspectDetail = lazy(() => import("@/pages/crm/ProspectDetail"));
const ReplyInbox = lazy(() => import("@/pages/crm/ReplyInbox"));
const CampaignDashboard = lazy(() => import("@/pages/crm/CampaignDashboard"));
const ImportHistory = lazy(() => import("@/pages/crm/ImportHistory"));
const SuppressionList = lazy(() => import("@/pages/crm/SuppressionList"));
const FocusView = lazy(() => import("@/pages/crm/FocusView"));

export const crmRoutes = (
  <>
    <Route
      path="/crm"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CRMDashboard />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/crm/prospects"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ProspectPipeline />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/crm/prospects/:prospectId"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ProspectDetail />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/crm/inbox"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ReplyInbox />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/crm/campaigns"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CampaignDashboard />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/crm/imports"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ImportHistory />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/crm/suppression"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <SuppressionList />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/crm/focus"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <FocusView />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
  </>
);
