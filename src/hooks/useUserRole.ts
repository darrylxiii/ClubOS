import { useRole } from "@/contexts/RoleContext";

export type UserRole = 'admin' | 'partner' | 'company_admin' | 'recruiter' | 'user' | 'strategist' | null;

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
