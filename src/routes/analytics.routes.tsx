import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

// Analytics Pages
const Analytics = lazy(() => import("@/pages/Analytics"));
const CandidateAnalytics = lazy(() => import("@/pages/CandidateAnalytics"));
// FunnelAnalytics consolidated into Engagement Hub
const RevenueAnalytics = lazy(() => import("@/pages/RevenueAnalytics"));
// MLDashboard consolidated into AI Analytics Hub
const HiringIntelligenceHub = lazy(() => import("@/pages/HiringIntelligenceHub"));
const CompanyIntelligence = lazy(() => import("@/pages/CompanyIntelligence"));
const MeetingIntelligence = lazy(() => import("@/pages/MeetingIntelligence"));
const MeetingInsights = lazy(() => import("@/pages/MeetingInsights"));
const CareerInsightsDashboard = lazy(() => import("@/pages/CareerInsightsDashboard"));
const InvestorDashboard = lazy(() => import("@/pages/admin/InvestorDashboard"));
// MessagingAnalytics consolidated into Communication Hub
// CompanyIntelligence moved to /companies/:companyId/intelligence (partner.routes.tsx)

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
    {/* Redirect old standalone analytics pages into candidate analytics hub */}
    <Route path="/salary-insights" element={<Navigate to="/analytics?tab=salary" replace />} />
    <Route path="/career-insights" element={<Navigate to="/analytics?tab=career" replace />} />
    <Route path="/career-path" element={<Navigate to="/analytics?tab=career-path" replace />} />
    <Route path="/candidate-analytics" element={<Navigate to="/analytics" replace />} />

    <Route
      path="/funnel-analytics"
      element={<Navigate to="/admin/engagement-hub?tab=funnel" replace />}
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
    <Route path="/ml-dashboard" element={<Navigate to="/admin/ai-analytics?tab=ml" replace />} />
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
    {/* /company-intelligence moved to /companies/:companyId/intelligence (partner.routes.tsx) */}
    <Route path="/company-intelligence" element={<Navigate to="/companies" replace />} />
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
    {/* /career-insights redirected to /analytics?tab=career above */}

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
      element={<Navigate to="/admin/communication-hub?tab=messaging" replace />}
    />
  </>
);
