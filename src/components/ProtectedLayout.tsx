import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedProviders } from "@/contexts/ProtectedProviders";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

/**
 * Unified Layout for all authenticated pages.
 * Enforces:
 * 1. Auth Check (ProtectedRoute)
 * 2. Data Providers (ProtectedProviders)
 * 3. UI Shell (AppLayout)
 * 4. Error Boundaries
 */
export const ProtectedLayout = () => {
    const location = useLocation();

    return (
        <ProtectedProviders>
            <ProtectedRoute>
                <AppLayout>
                    <RouteErrorBoundary key={location.pathname}>
                        <Suspense fallback={<PageLoader />}>
                            <Outlet />
                        </Suspense>
                    </RouteErrorBoundary>
                </AppLayout>
            </ProtectedRoute>
        </ProtectedProviders>
    );
};
