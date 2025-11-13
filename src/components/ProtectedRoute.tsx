import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { useState, useEffect } from "react";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  logger.debug("[ProtectedRoute] State", { loading, hasUser: !!user });

  // ENTERPRISE: 3-second timeout for loading state
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        logger.error("[ProtectedRoute] 🚨 Loading timeout after 3s - forcing redirect");
        setLoadingTimeout(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // If timeout exceeded, redirect to auth
  if (loadingTimeout) {
    logger.error("[ProtectedRoute] Timeout exceeded, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
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

  logger.debug("[ProtectedRoute] User authenticated, rendering protected content");
  return <>{children}</>;
};
