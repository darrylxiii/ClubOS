import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { Loader2 } from "lucide-react";

// Lazy load Club Projects pages
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("@/pages/ProjectDetailPage"));
const ProjectApplyPage = lazy(() => import("@/pages/ProjectApplyPage"));
const ContractListPage = lazy(() => import("@/pages/ContractListPage"));
const ContractDetailPage = lazy(() => import("@/pages/ContractDetailPage"));
const ContractSignaturePage = lazy(() => import("@/pages/ContractSignaturePage"));
const TimeTrackingPage = lazy(() => import("@/pages/TimeTrackingPage"));

// New Club Projects pages
const PostProjectPage = lazy(() => import("@/pages/PostProjectPage"));
const FreelancerSetupPage = lazy(() => import("@/pages/FreelancerSetupPage"));
const GigMarketplacePage = lazy(() => import("@/pages/GigMarketplacePage"));
const ProjectProposalsPage = lazy(() => import("@/pages/ProjectProposalsPage"));
const ProjectDisputesPage = lazy(() => import("@/pages/ProjectDisputesPage"));

const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background">
    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
    <p className="text-muted-foreground animate-pulse">Loading...</p>
  </div>
);

export const projectsRoutes = (
  <>
    {/* Projects Marketplace */}
    <Route 
      path="/projects" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ProjectsPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/projects/new" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PostProjectPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/projects/freelancer/setup" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <FreelancerSetupPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/projects/gigs" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <GigMarketplacePage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/projects/proposals" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ProjectProposalsPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/projects/disputes" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ProjectDisputesPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/projects/:projectId" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ProjectDetailPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/projects/:projectId/apply" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ProjectApplyPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/projects/:projectId/proposals" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ProjectProposalsPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />
    
    {/* Contracts */}
    <Route 
      path="/contracts" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ContractListPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/contracts/:contractId" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ContractDetailPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/contracts/:contractId/sign" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ContractSignaturePage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />
    
    {/* Time Tracking */}
    <Route 
      path="/time-tracking" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <TimeTrackingPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />
  </>
);
