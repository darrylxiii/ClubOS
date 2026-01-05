import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

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
const ProjectTalentPage = lazy(() => import("@/pages/ProjectTalentPage"));
const GigMarketplacePage = lazy(() => import("@/pages/GigMarketplacePage"));
const CreateGigPage = lazy(() => import("@/pages/CreateGigPage"));
const GigDetailPage = lazy(() => import("@/pages/GigDetailPage"));
const ProjectProposalsPage = lazy(() => import("@/pages/ProjectProposalsPage"));
const ProjectDisputesPage = lazy(() => import("@/pages/ProjectDisputesPage"));

// Phase 4: Revenue & Growth pages
const ConnectsStorePage = lazy(() => import("@/pages/ConnectsStorePage"));
const RetainerContractsPage = lazy(() => import("@/pages/RetainerContractsPage"));
const TeamManagementPage = lazy(() => import("@/pages/TeamManagementPage"));

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
      path="/projects/gigs/create" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CreateGigPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/projects/gigs/:gigId" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <GigDetailPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/projects/talent" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ProjectTalentPage />
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

    {/* Connects Store */}
    <Route 
      path="/projects/connects" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ConnectsStorePage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />

    {/* Retainer Contracts */}
    <Route 
      path="/contracts/retainers" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <RetainerContractsPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />

    {/* Team Management */}
    <Route 
      path="/projects/team" 
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <TeamManagementPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      } 
    />
  </>
);
