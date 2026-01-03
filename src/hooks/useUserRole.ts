import { useRole } from "@/contexts/RoleContext";
// Re-export UserRole from centralized types
export type { UserRole } from "@/types/roles";

/**
 * @deprecated Use useRole from RoleContext instead for better performance
 * This hook now wraps RoleContext to maintain backward compatibility
 */
export const useUserRole = () => {
  const { currentRole, loading, companyId } = useRole();
  
  return { 
    role: currentRole, 
    companyId, 
    loading 
  };
};
