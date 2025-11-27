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

// Partner Pages
const CompanyApplications = lazy(() => import("@/pages/CompanyApplications"));
const CompanyJobsDashboard = lazy(() => import("@/pages/CompanyJobsDashboard"));
const Companies = lazy(() => import("@/pages/Companies"));
const CompanyPage = lazy(() => import("@/pages/CompanyPage"));
const PartnerAnalyticsDashboard = lazy(() => import("@/pages/PartnerAnalyticsDashboard"));
const PartnerRejections = lazy(() => import("@/pages/PartnerRejections"));
const PartnerTargetCompanies = lazy(() => import("@/pages/PartnerTargetCompanies"));
const CompanySettings = lazy(() => import("@/pages/CompanySettings"));
const CompanyDomainsSettings = lazy(() => import("@/pages/CompanyDomainsSettings"));
const AuditLog = lazy(() => import("@/pages/partner/AuditLog"));

export const partnerRoutes = (
  <>
    <Route
      path="/company-applications"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CompanyApplications />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/company-jobs"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CompanyJobsDashboard />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/companies"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Companies />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/companies/:companyId"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CompanyPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/partner/analytics"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PartnerAnalyticsDashboard />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/partner/rejections"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PartnerRejections />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/partner/target-companies"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PartnerTargetCompanies />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/company-settings"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CompanySettings />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/company-domains"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CompanyDomainsSettings />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/partner/audit-log"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <AuditLog />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
  </>
);
