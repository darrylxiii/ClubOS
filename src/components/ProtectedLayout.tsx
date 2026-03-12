import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedProviders } from "@/contexts/ProtectedProviders";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageLoader } from "@/components/PageLoader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { motion, AnimatePresence } from "@/lib/motion";
import { supportsViewTransitions } from "@/hooks/useViewTransition";

/**
 * Unified Layout for all authenticated pages.
 * Uses native View Transitions API when supported for cinematic route changes.
 * Falls back to framer-motion fade when unsupported.
 */
export const ProtectedLayout = () => {
  const location = useLocation();

  return (
    <ProtectedProviders>
      <ProtectedRoute>
        <AppLayout>
          <RouteErrorBoundary>
            {supportsViewTransitions ? (
              /* Browser handles cross-fade natively via ::view-transition-* */
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            ) : (
              /* Fallback: framer-motion fade */
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  <Suspense fallback={<PageLoader />}>
                    <Outlet />
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            )}
          </RouteErrorBoundary>
        </AppLayout>
        <MobileBottomNav />
      </ProtectedRoute>
    </ProtectedProviders>
  );
};
