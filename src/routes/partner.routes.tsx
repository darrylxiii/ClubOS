import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

// Partner Pages
const CompanyApplications = lazy(() => import("@/pages/CompanyApplications"));
const CompanyJobsDashboard = lazy(() => import("@/pages/CompanyJobsDashboard"));
const Companies = lazy(() => import("@/pages/Companies"));
const CompanyPage = lazy(() => import("@/pages/CompanyPage"));
const PartnerAnalyticsDashboard = lazy(() => import("@/pages/PartnerAnalyticsDashboard"));
const PartnerRejections = lazy(() => import("@/pages/PartnerRejections"));
const PartnerTargetCompanies = lazy(() => import("@/pages/PartnerTargetCompanies"));
const AuditLog = lazy(() => import("@/pages/partner/AuditLog"));
const BillingDashboard = lazy(() => import("@/pages/partner/BillingDashboard"));
const SLADashboard = lazy(() => import("@/pages/partner/SLADashboard"));
const IntegrationsManagement = lazy(() => import("@/pages/partner/IntegrationsManagement"));
const LiveInterview = lazy(() => import("@/pages/partner/LiveInterview"));
const PartnerContractsPage = lazy(() => import("@/pages/partner/PartnerContractsPage"));
const CreateContractPage = lazy(() => import("@/pages/partner/CreateContractPage"));

/**
 * Partner routes
 * 
 * CONSOLIDATION:
 * - /company-settings → redirects to /settings?tab=company
 * - /company-domains → redirects to /settings?tab=company
 */
export const partnerRoutes = (
  <>
    <Route
      path="/partner/live-interview"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <LiveInterview />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
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
    
    {/* Legacy routes - redirect to unified Settings */}
    <Route path="/company-settings" element={<Navigate to="/settings?tab=company" replace />} />
    <Route path="/company-domains" element={<Navigate to="/settings?tab=company" replace />} />
    <Route path="/company-domains/:id" element={<Navigate to="/settings?tab=company" replace />} />
    
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
    <Route
      path="/partner/billing"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <BillingDashboard />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/partner/sla"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <SLADashboard />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/partner/integrations"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <IntegrationsManagement />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/partner/contracts"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PartnerContractsPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
    <Route
      path="/partner/contracts/new"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CreateContractPage />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />
  </>
);
