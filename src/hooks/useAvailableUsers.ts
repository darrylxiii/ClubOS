import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AvailableUser {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  current_title: string | null;
  role: string | null;
  hasEmployeeProfile: boolean;
}

/**
 * Fetches available users for employee selection
 * @param excludeExistingEmployees - Whether to exclude users who already have employee profiles
 * @param companyId - Company ID to filter by:
 *   - undefined: Query is disabled, waiting for company context to load
 *   - null: Fetch ALL users (admin fallback)
 *   - string: Filter users by company membership
 */
export const useAvailableUsers = (excludeExistingEmployees = true, companyId?: string | null) => {
  return useQuery({
    queryKey: ['available-users', excludeExistingEmployees, companyId],
    queryFn: async (): Promise<AvailableUser[]> => {
      console.log('useAvailableUsers: Starting query with companyId:', companyId);

      // If companyId is a valid string, filter by company membership
      if (typeof companyId === 'string' && companyId.length > 0) {
        console.log('useAvailableUsers: Filtering by company:', companyId);

        // Step 1: Get all active company members
        const { data: companyMembers, error: membersError } = await supabase
          .from('company_members')
          .select('user_id, role')
          .eq('company_id', companyId)
          .eq('is_active', true);

        if (membersError) {
          console.error('useAvailableUsers: Error fetching company members:', membersError);
          throw membersError;
        }

        if (!companyMembers || companyMembers.length === 0) {
          console.log('useAvailableUsers: No company members found for company:', companyId);
          return [];
        }

        const memberUserIds = companyMembers.map(m => m.user_id);
        console.log('useAvailableUsers: Found', memberUserIds.length, 'company members');

        // Step 2: Fetch profiles for these members
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, current_title')
          .in('id', memberUserIds)
          .order('full_name');

        if (profilesError) {
          console.error('useAvailableUsers: Error fetching profiles:', profilesError);
          throw profilesError;
        }

        console.log('useAvailableUsers: Found', profiles?.length || 0, 'profiles');

        // Step 3: Fetch existing employee profiles to mark who already has one
        const { data: existingEmployees, error: employeesError } = await supabase
          .from('employee_profiles')
          .select('user_id')
          .in('user_id', memberUserIds);

        if (employeesError) {
          console.error('useAvailableUsers: Error fetching existing employees:', employeesError);
          throw employeesError;
        }

        const existingEmployeeIds = new Set(existingEmployees?.map(e => e.user_id) || []);

        // Step 4: Create role map from company_members
        const roleMap = new Map<string, string>();
        companyMembers.forEach(m => {
          roleMap.set(m.user_id, m.role);
        });

        // Step 5: Build the final user list
        const users: AvailableUser[] = (profiles || []).map(p => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
          current_title: p.current_title,
          role: roleMap.get(p.id) || null,
          hasEmployeeProfile: existingEmployeeIds.has(p.id),
        }));

        if (excludeExistingEmployees) {
          const filtered = users.filter(u => !u.hasEmployeeProfile);
          console.log('useAvailableUsers: After excluding existing employees:', filtered.length, 'users');
          return filtered;
        }

        console.log('useAvailableUsers: Returning', users.length, 'users');
        return users;
      }

      // If companyId is null (not undefined), fetch ALL users (admin fallback)
      if (companyId === null) {
        console.log('useAvailableUsers: Fetching all users (admin fallback)');

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, current_title')
          .order('full_name');

        if (profilesError) {
          console.error('useAvailableUsers: Error fetching all profiles:', profilesError);
          throw profilesError;
        }

        // Fetch user roles
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');

        if (rolesError) {
          console.error('useAvailableUsers: Error fetching roles:', rolesError);
          throw rolesError;
        }

        // Fetch existing employee profiles
        const { data: existingEmployees, error: employeesError } = await supabase
          .from('employee_profiles')
          .select('user_id');

        if (employeesError) {
          console.error('useAvailableUsers: Error fetching existing employees:', employeesError);
          throw employeesError;
        }

        const existingEmployeeIds = new Set(existingEmployees?.map(e => e.user_id) || []);
        const roleMap = new Map<string, string>();
        roles?.forEach(r => {
          const currentRole = roleMap.get(r.user_id);
          const priority: Record<string, number> = { admin: 4, strategist: 3, partner: 2, recruiter: 1 };
          if (!currentRole || (priority[r.role] || 0) > (priority[currentRole] || 0)) {
            roleMap.set(r.user_id, r.role);
          }
        });

        const users: AvailableUser[] = (profiles || []).map(p => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
          current_title: p.current_title,
          role: roleMap.get(p.id) || null,
          hasEmployeeProfile: existingEmployeeIds.has(p.id),
        }));

        if (excludeExistingEmployees) {
          return users.filter(u => !u.hasEmployeeProfile);
        }

        return users;
      }

      // This shouldn't happen if enabled is properly set, but return empty as fallback
      console.log('useAvailableUsers: Unexpected state, returning empty array');
      return [];
    },
    // Only run query when companyId is NOT undefined (either null or a valid string)
    enabled: companyId !== undefined,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
};
