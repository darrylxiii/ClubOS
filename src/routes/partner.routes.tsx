import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

// Partner Hub (consolidated index)
const PartnerHub = lazy(() => import("@/pages/partner/PartnerHub"));

// Individual Partner Pages (still used as embedded tab content via PartnerHub)
const CompanyApplications = lazy(() => import("@/pages/CompanyApplications"));
const CompanyJobsDashboard = lazy(() => import("@/pages/CompanyJobsDashboard"));
const Companies = lazy(() => import("@/pages/Companies"));
const CompanyPage = lazy(() => import("@/pages/CompanyPage"));
const CompanyIntelligence = lazy(() => import("@/pages/CompanyIntelligence"));
const LiveInterview = lazy(() => import("@/pages/partner/LiveInterview"));
const PartnerContractsPage = lazy(() => import("@/pages/partner/PartnerContractsPage"));
const CreateContractPage = lazy(() => import("@/pages/partner/CreateContractPage"));

/**
 * Partner routes
 * 
 * CONSOLIDATION:
 * - /partner (bare path) → PartnerHub (tabbed hub for all partner tools)
 * - /partner/analytics, /partner/billing, /partner/sla, /partner/integrations,
 *   /partner/audit-log, /partner/rejections, /partner/target-companies → redirects to /partner?tab=X
 * - /company-settings → redirects to /settings?tab=company
 * - /company-domains → redirects to /settings?tab=company
 * - /company-intelligence → now at /companies/:companyId/intelligence
 */
export const partnerRoutes = (
  <>
    {/* ════════════════════════════════════════════ */}
    {/* PARTNER HUB                                  */}
    {/* ════════════════════════════════════════════ */}
    <Route
      path="/partner/hub"
      element={
        <ProtectedRoute>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PartnerHub />
            </Suspense>
          </RouteErrorBoundary>
        </ProtectedRoute>
      }
    />

    {/* Partner sub-route redirects → PartnerHub */}
    <Route path="/partner/analytics" element={<Navigate to="/partner/hub?tab=analytics" replace />} />
    <Route path="/partner/billing" element={<Navigate to="/partner/hub?tab=billing" replace />} />
    <Route path="/partner/sla" element={<Navigate to="/partner/hub?tab=sla" replace />} />
    <Route path="/partner/integrations" element={<Navigate to="/partner/hub?tab=integrations" replace />} />
    <Route path="/partner/audit-log" element={<Navigate to="/partner/hub?tab=audit-log" replace />} />
    <Route path="/partner/rejections" element={<Navigate to="/partner/hub?tab=rejections" replace />} />
    <Route path="/partner/target-companies" element={<Navigate to="/partner/hub?tab=target-companies" replace />} />
    <Route path="/social-management" element={<Navigate to="/partner/hub?tab=social" replace />} />

    {/* ════════════════════════════════════════════ */}
    {/* LIVE INTERVIEW (standalone — no hub context) */}
    {/* ════════════════════════════════════════════ */}
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

    {/* ════════════════════════════════════════════ */}
    {/* COMPANY ROUTES                               */}
    {/* ════════════════════════════════════════════ */}
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
    {/* Company Intelligence — detail page requiring a companyId */}
    <Route
      path="/companies/:companyId/intelligence"
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

    {/* ════════════════════════════════════════════ */}
    {/* CONTRACTS                                    */}
    {/* ════════════════════════════════════════════ */}
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

    {/* ════════════════════════════════════════════ */}
    {/* LEGACY REDIRECTS                             */}
    {/* ════════════════════════════════════════════ */}
    <Route path="/company-settings" element={<Navigate to="/settings?tab=company" replace />} />
    <Route path="/company-domains" element={<Navigate to="/settings?tab=company" replace />} />
    <Route path="/company-domains/:id" element={<Navigate to="/settings?tab=company" replace />} />
  </>
);
