import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { JobDashboardRoute } from "@/components/routes/JobDashboardRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-12 h-12 animate-spin text-primary" />
  </div>
);

// Job Pages
const Jobs = lazy(() => import("@/pages/Jobs"));
const JobDetail = lazy(() => import("@/pages/JobDetail"));
const JobDashboard = lazy(() => import("@/pages/JobDashboard"));
const JobsMap = lazy(() => import("@/pages/JobsMap"));
const Applications = lazy(() => import("@/pages/Applications"));
const ApplicationDetail = lazy(() => import("@/pages/ApplicationDetail"));
const InteractionEntry = lazy(() => import("@/pages/InteractionEntry"));
const InteractionsFeed = lazy(() => import("@/pages/InteractionsFeed"));

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
    <Route
      path="/jobs/map"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <JobsMap />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
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
      path="/applications"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Applications />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
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
    <Route
      path="/interactions/new"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <InteractionEntry />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/interactions"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <InteractionsFeed />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
  </>
);
