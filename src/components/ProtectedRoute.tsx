import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [accountStatus, setAccountStatus] = useState<'approved' | 'pending' | 'declined' | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  logger.debug("[ProtectedRoute] State", { loading, hasUser: !!user, checkingStatus, accountStatus, onboardingCompleted });

  // Reduced timeout to 4s since AuthContext guarantees loading=false within 3s
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        logger.error("[ProtectedRoute] 🚨 Loading timeout after 4s - forcing redirect");
        setLoadingTimeout(true);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      // Reset timeout flag when loading completes normally
      setLoadingTimeout(false);
    }
  }, [loading]);

  // Check onboarding completion and account approval status
  useEffect(() => {
    const checkAccountStatus = async () => {
      if (!user) {
        setCheckingStatus(false);
        return;
      }

      try {
        // Fetch profile and user roles in parallel
        const [profileResult, userRolesResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('account_status, onboarding_completed_at')
            .eq('id', user.id)
            .single(),
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
        ]);

        const { data: profile, error: profileError } = profileResult;
        const { data: userRoles } = userRolesResult;

        // Handle missing profile gracefully
        if (profileError || !profile) {
          logger.warn("[ProtectedRoute] No profile found for user, using safe defaults", { profileError });
          setOnboardingCompleted(false);
          setAccountStatus('pending');
          setCheckingStatus(false);
          return;
        }

        // Check if user has elevated roles
        const roles = userRoles?.map((r) => r.role) || [];
        const isAdmin = roles.includes('admin');
        const isPartner = roles.includes('partner');
        const isStrategist = roles.includes('strategist');
        const isPureCandidate = !isAdmin && !isPartner && !isStrategist;

        // Only pure candidates need to complete onboarding
        const needsOnboarding = isPureCandidate && !profile.onboarding_completed_at;

        setOnboardingCompleted(!needsOnboarding);
        setAccountStatus((profile.account_status as 'approved' | 'pending' | 'declined') || 'pending');
      } catch (error) {
        logger.error("[ProtectedRoute] Error in status check:", error);
        // Set safe defaults on error to prevent infinite loading
        setOnboardingCompleted(false);
        setAccountStatus('pending');
      } finally {
        setCheckingStatus(false);
      }
    };

    if (user && !loading) {
      checkAccountStatus();
    }
  }, [user, loading]);

  // If timeout exceeded AND no user, redirect to auth
  if (loadingTimeout && !user) {
    logger.error("[ProtectedRoute] ⚠️ Auth timeout exceeded with no user, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  // Still loading - show loading state
  if (loading || checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-black uppercase tracking-tight">LOADING...</div>
      </div>
    );
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
