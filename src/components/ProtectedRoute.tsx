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

  logger.debug("[ProtectedRoute] State", { loading, hasUser: !!user });

  // Reduced timeout to 4s since AuthContext guarantees loading=false within 3s
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        logger.error("[ProtectedRoute] 🚨 Loading timeout after 4s - forcing redirect");
        setLoadingTimeout(true);
      }, 4000);
      return () => clearTimeout(timer);
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
        const { data, error } = await supabase
          .from('profiles')
          .select('account_status, onboarding_completed_at')
          .eq('id', user.id)
          .single();

        if (error) {
          logger.error("[ProtectedRoute] Error checking account status:", error);
          setCheckingStatus(false);
          return;
        }

        setOnboardingCompleted(!!data.onboarding_completed_at);
        setAccountStatus(data.account_status as 'approved' | 'pending' | 'declined');
      } catch (error) {
        logger.error("[ProtectedRoute] Error in status check:", error);
      } finally {
        setCheckingStatus(false);
      }
    };

    if (user && !loading) {
      checkAccountStatus();
    }
  }, [user, loading]);

  // If timeout exceeded, redirect to auth
  if (loadingTimeout) {
    logger.error("[ProtectedRoute] ⚠️ Auth timeout exceeded, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  if (loading || checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-black uppercase tracking-tight">LOADING...</div>
      </div>
    );
  }

  if (!user) {
    logger.info("[ProtectedRoute] No user, redirecting to /auth");
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

  logger.debug("[ProtectedRoute] User authenticated and approved, rendering protected content");
  return <>{children}</>;
};
