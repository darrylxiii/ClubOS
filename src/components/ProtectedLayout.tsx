import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedProviders } from "@/contexts/ProtectedProviders";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

/**
 * Unified Layout for all authenticated pages.
 * MFA enforcement is now handled inside ProtectedRoute
 * to eliminate the second sequential loading gate.
 */
export const ProtectedLayout = () => {
  return (
    <ProtectedProviders>
      <ProtectedRoute>
        <AppLayout>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    </ProtectedProviders>
  );
};
