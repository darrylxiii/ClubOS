/**
 * Centralized role type definitions
 * All role-related types should be imported from here
 */

export type UserRole = 'admin' | 'partner' | 'company_admin' | 'recruiter' | 'user' | 'strategist' | null;

export type NonNullUserRole = Exclude<UserRole, null>;

export interface RoleOption {
  value: UserRole;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export interface RolePermissions {
  canViewAdmin: boolean;
  canManageUsers: boolean;
  canViewFinancials: boolean;
  canViewCandidates: boolean;
  canEditJobs: boolean;
}

export const ROLE_PRIORITY: NonNullUserRole[] = ['admin', 'strategist', 'partner', 'user'];

export const getRolePriority = (role: UserRole): number => {
  if (!role) return -1;
  const index = ROLE_PRIORITY.indexOf(role as NonNullUserRole);
  return index === -1 ? ROLE_PRIORITY.length : index;
};
