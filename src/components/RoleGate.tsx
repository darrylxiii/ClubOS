import { ReactNode } from "react";
import { useRole } from "@/contexts/RoleContext";
import { UserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface RoleGateProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
  showLoading?: boolean;
}

export const RoleGate = ({ 
  children, 
  allowedRoles, 
  fallback = null,
  showLoading = false 
}: RoleGateProps) => {
  const { currentRole: role, loading } = useRole();

  if (loading && showLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loading && !showLoading) {
    return null;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
