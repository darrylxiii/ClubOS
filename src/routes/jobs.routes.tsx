import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { JobDashboardRoute } from "@/components/routes/JobDashboardRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

// Job Pages
const Jobs = lazy(() => import("@/pages/Jobs"));
const JobDetail = lazy(() => import("@/pages/JobDetail"));
const JobDashboard = lazy(() => import("@/pages/JobDashboard"));
const ApplicationDetail = lazy(() => import("@/pages/ApplicationDetail"));
const InteractionEntry = lazy(() => import("@/pages/InteractionEntry"));

export const jobsRoutes = (
  <>
    <Route
      path="/jobs"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Jobs />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    {/* Redirect legacy standalone routes to Jobs hub tabs */}
    <Route path="/jobs/map" element={<Navigate to="/jobs?tab=map" replace />} />
    <Route path="/applications" element={<Navigate to="/jobs?tab=applications" replace />} />
    <Route path="/company-applications" element={<Navigate to="/jobs?tab=applications" replace />} />
    <Route path="/hiring-intelligence" element={<Navigate to="/jobs?tab=intelligence" replace />} />
    <Route path="/interactions" element={<Navigate to="/jobs?tab=interactions" replace />} />
    <Route path="/interactions/new" element={
      <ProtectedRoute>
        <RouteErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <InteractionEntry />
          </Suspense>
        </RouteErrorBoundary>
      </ProtectedRoute>
    } />
    <Route
      path="/jobs/:jobId"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <JobDetail />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/jobs/:jobId/dashboard"
      element={
        <JobDashboardRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <JobDashboard />
            </Suspense>
          </RouteErrorBoundary>
        </JobDashboardRoute>
      }
    />
    <Route
      path="/applications/:applicationId"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ApplicationDetail />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
  </>
);