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

export const useAvailableUsers = (excludeExistingEmployees = true) => {
  return useQuery({
    queryKey: ['available-users', excludeExistingEmployees],
    queryFn: async () => {
      // Fetch all profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          current_title
        `)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch existing employee profiles
      const { data: existingEmployees, error: employeesError } = await supabase
        .from('employee_profiles')
        .select('user_id');

      if (employeesError) throw employeesError;

      const existingEmployeeIds = new Set(existingEmployees?.map(e => e.user_id) || []);
      const roleMap = new Map<string, string>();
      roles?.forEach(r => {
        // Prefer admin > strategist > partner > recruiter
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
    },
  });
};
