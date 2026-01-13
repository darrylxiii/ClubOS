import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStatus } from "@/contexts/UserStatusContext";
import { logger } from "@/lib/logger";
import { useState, useEffect } from "react";
import { PageLoader } from "@/components/PageLoader";

/**
 * Optimized ProtectedRoute using cached UserStatusContext
 * Prevents duplicate profile/role fetches across route changes
 */
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { accountStatus, onboardingCompleted, isLoading: statusLoading } = useUserStatus();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const loading = authLoading || statusLoading;

  logger.debug("[ProtectedRoute] State", { loading, hasUser: !!user, accountStatus, onboardingCompleted });

  // Reduced timeout to 6s since AuthContext guarantees loading=false within 3s
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        logger.warn("[ProtectedRoute] 🚨 Loading timeout after 6s - forcing redirect");
        setLoadingTimeout(true);
      }, 6000);
      return () => clearTimeout(timer);
    } else {
      // Reset timeout flag when loading completes normally
      setLoadingTimeout(false);
    }
  }, [loading]);

  // If timeout exceeded AND no user, redirect to auth
  if (loadingTimeout && !user) {
    logger.error("[ProtectedRoute] ⚠️ Auth timeout exceeded with no user, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  // Still loading - show loading state
  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    logger.info("[ProtectedRoute] No user after loading complete, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  // Check if onboarding is completed first
  if (onboardingCompleted === false) {
    logger.info("[ProtectedRoute] Onboarding not completed, redirecting to /oauth-onboarding");
    return <Navigate to="/oauth-onboarding" replace />;
  }

  // Redirect based on account status
  if (accountStatus === 'pending' || accountStatus === 'declined') {
    logger.info("[ProtectedRoute] User account pending/declined, redirecting to /pending-approval");
    return <Navigate to="/pending-approval" replace />;
  }

  logger.debug("[ProtectedRoute] ✅ User authenticated and approved, rendering protected content");
  return <>{children}</>;
};
