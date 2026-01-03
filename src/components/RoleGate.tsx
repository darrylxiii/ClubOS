import { ReactNode } from "react";
import { useRole } from "@/contexts/RoleContext";
import { UserRole } from "@/hooks/useUserRole";
import { UnifiedLoader } from "@/components/ui/unified-loader";

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
    return <UnifiedLoader variant="section" />;
  }

  if (loading && !showLoading) {
    return null;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
