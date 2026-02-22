import { ReactNode, Suspense } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedProviders, ProtectedProvidersLoader } from "@/contexts/ProtectedProviders";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MfaEnforcementGuard } from "@/components/MfaEnforcementGuard";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

/**
 * Unified Layout for all authenticated pages.
 * Enforces:
 * 1. Auth Check (ProtectedRoute)
 * 2. MFA Enforcement for admin/strategist roles
 * 3. Data Providers (ProtectedProviders)
 * 4. UI Shell (AppLayout)
 * 5. Error Boundaries
 */
export const ProtectedLayout = () => {
    return (
        <ProtectedProviders>
            <ProtectedRoute>
                <MfaEnforcementGuard>
                    <AppLayout>
                        <RouteErrorBoundary>
                            <Suspense fallback={<PageLoader />}>
                                <Outlet />
                            </Suspense>
                        </RouteErrorBoundary>
                    </AppLayout>
                </MfaEnforcementGuard>
            </ProtectedRoute>
        </ProtectedProviders>
    );
};
