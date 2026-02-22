import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrefetch } from "@/hooks/useAuthPrefetch";
import { logger } from "@/lib/logger";
import { useState, useEffect } from "react";
import { PageLoader } from "@/components/PageLoader";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { data: prefetch, isLoading: prefetchLoading } = useAuthPrefetch();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Timeout guard — force redirect if auth hangs
  useEffect(() => {
    if (authLoading) {
      const timer = setTimeout(() => {
        logger.warn("[ProtectedRoute] Loading timeout after 6s");
        setLoadingTimeout(true);
      }, 6000);
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [authLoading]);

  // Timeout with no user → redirect
  if (loadingTimeout && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Still loading auth or prefetch data
  if (authLoading || (user && prefetchLoading)) {
    return <PageLoader />;
  }

  if (!user) {
    logger.info("[ProtectedRoute] No user, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  // Prefetch data available — check onboarding + account status + MFA
  if (prefetch) {
    const roles = prefetch.roles;
    const isAdmin = roles.includes('admin');
    const isPartner = roles.includes('partner');
    const isStrategist = roles.includes('strategist');
    const isPureCandidate = !isAdmin && !isPartner && !isStrategist;

    // Onboarding check (candidates only)
    const skipOnboarding = user.user_metadata?.skip_onboarding === true;
    const needsOnboarding = !skipOnboarding && isPureCandidate && !prefetch.profile?.onboarding_completed_at;

    if (needsOnboarding) {
      return <Navigate to="/oauth-onboarding" replace />;
    }

    // Account status check
    const status = (prefetch.profile?.account_status as string) || 'pending';
    if (status === 'pending' || status === 'declined') {
      return <Navigate to="/pending-approval" replace />;
    }

    // MFA enforcement for admin/strategist
    const hasElevatedRole = isAdmin || isStrategist;
    if (hasElevatedRole && !prefetch.mfaFactors.hasVerifiedTotp) {
      return <Navigate to="/mfa-setup" replace />;
    }

    // Force password change check
    if (user.user_metadata?.force_password_change === true) {
      return <Navigate to="/reset-password/new" replace />;
    }
  }

  return <>{children}</>;
};
