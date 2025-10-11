import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  console.log("[ProtectedRoute] State:", { loading, user: !!user });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-black uppercase tracking-tight">LOADING...</div>
      </div>
    );
  }

  if (!user) {
    console.log("[ProtectedRoute] No user, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  console.log("[ProtectedRoute] User authenticated, rendering protected content");
  return <>{children}</>;
};
