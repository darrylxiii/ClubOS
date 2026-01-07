import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

// Analytics Pages
const Analytics = lazy(() => import("@/pages/Analytics"));
const CandidateAnalytics = lazy(() => import("@/pages/CandidateAnalytics"));
const FunnelAnalytics = lazy(() => import("@/pages/FunnelAnalytics"));
const RevenueAnalytics = lazy(() => import("@/pages/RevenueAnalytics"));
// MLDashboard consolidated into EnhancedMLDashboard
const EnhancedMLDashboard = lazy(() => import("@/pages/EnhancedMLDashboard"));
const HiringIntelligenceHub = lazy(() => import("@/pages/HiringIntelligenceHub"));
const CompanyIntelligence = lazy(() => import("@/pages/CompanyIntelligence"));
const MeetingIntelligence = lazy(() => import("@/pages/MeetingIntelligence"));
const MeetingInsights = lazy(() => import("@/pages/MeetingInsights"));
const CareerHub = lazy(() => import("@/pages/CareerHub"));
const InvestorDashboard = lazy(() => import("@/pages/admin/InvestorDashboard"));
const MessagingAnalytics = lazy(() => import("@/pages/MessagingAnalytics"));

export const analyticsRoutes = (
  <>
    <Route
      path="/analytics"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Analytics />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/candidate-analytics"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CandidateAnalytics />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/funnel-analytics"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <FunnelAnalytics />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/revenue-analytics"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <RevenueAnalytics />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/ml-dashboard"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <EnhancedMLDashboard />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    {/* /enhanced-ml consolidated into /ml-dashboard */}
    <Route
      path="/hiring-intelligence"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <HiringIntelligenceHub />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/company-intelligence"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CompanyIntelligence />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/meeting-intelligence"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <MeetingIntelligence />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/meeting-insights"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <MeetingInsights />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    {/* Career Hub - Unified career intelligence center */}
    <Route
      path="/career"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CareerHub />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    {/* Redirects for deprecated career routes */}
    <Route path="/career-insights" element={<Navigate to="/career?tab=insights" replace />} />
    <Route path="/career-path" element={<Navigate to="/career?tab=path" replace />} />
    <Route path="/salary-insights" element={<Navigate to="/career?tab=salary" replace />} />
    <Route
      path="/investor-dashboard"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <InvestorDashboard />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/messaging-analytics"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <MessagingAnalytics />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
  </>
);
