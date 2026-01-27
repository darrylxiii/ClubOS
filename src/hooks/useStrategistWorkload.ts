import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StrategistWorkload {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
  title: string | null;
  companyCount: number;
  candidateCount: number;
  activeApplications: number;
  capacityPercent: number;
  maxCapacity: number;
}

export interface TeamMember {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  current_title: string | null;
}

const MAX_COMPANY_CAPACITY = 25;
const MAX_CANDIDATE_CAPACITY = 50;

export function useStrategistWorkload() {
  return useQuery({
    queryKey: ['strategist-workload'],
    queryFn: async (): Promise<StrategistWorkload[]> => {
      // Fetch user_roles for admins and strategists first
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'strategist']);

      if (rolesError) throw rolesError;
      if (!roles?.length) return [];

      const teamUserIds = [...new Set(roles.map(r => r.user_id))];

      // Fetch profiles for these users
      const { data: teamMembers, error: teamError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, current_title')
        .in('id', teamUserIds)
        .order('full_name');

      if (teamError) throw teamError;
      if (!teamMembers?.length) return [];

      if (teamError) throw teamError;
      if (!teamMembers?.length) return [];

      // Fetch company assignments
      const { data: companyAssignments } = await supabase
        .from('company_strategist_assignments')
        .select('strategist_id, company_id')
        .eq('is_active', true);

      // Fetch candidate assignments
      const { data: candidates } = await supabase
        .from('candidate_profiles')
        .select('id, assigned_strategist_id')
        .not('assigned_strategist_id', 'is', null);

      // Fetch active applications for assigned candidates
      const candidateIds = candidates?.map(c => c.id) || [];
      let activeApps: any[] = [];
      
      if (candidateIds.length > 0) {
        const { data: apps } = await supabase
          .from('applications')
          .select('id, candidate_id, status')
          .in('candidate_id', candidateIds)
          .in('status', ['new', 'reviewing', 'shortlisted', 'interviewing']);
        activeApps = apps || [];
      }

      // Calculate workload for each team member
      const workloadMap: StrategistWorkload[] = teamMembers.map((member: any) => {
        const companyCount = companyAssignments?.filter(
          (a: any) => a.strategist_id === member.id
        ).length || 0;

        const assignedCandidates = candidates?.filter(
          (c: any) => c.assigned_strategist_id === member.id
        ) || [];
        const candidateCount = assignedCandidates.length;

        const candidateIdsForStrategist = assignedCandidates.map((c: any) => c.id);
        const activeApplications = activeApps.filter(
          (a: any) => candidateIdsForStrategist.includes(a.candidate_id)
        ).length;

        // Calculate capacity as weighted average
        const companyCapacity = (companyCount / MAX_COMPANY_CAPACITY) * 100;
        const candidateCapacity = (candidateCount / MAX_CANDIDATE_CAPACITY) * 100;
        const capacityPercent = Math.min(100, Math.round((companyCapacity * 0.4 + candidateCapacity * 0.6)));

        return {
          id: member.id,
          full_name: member.full_name || 'Unknown',
          avatar_url: member.avatar_url,
          email: member.email,
          title: member.current_title,
          companyCount,
          candidateCount,
          activeApplications,
          capacityPercent,
          maxCapacity: MAX_CANDIDATE_CAPACITY,
        };
      });

      return workloadMap.sort((a, b) => a.capacityPercent - b.capacityPercent);
    },
    staleTime: 30000, // 30 seconds
  });
}

export function useStrategistList() {
  return useQuery({
    queryKey: ['strategist-list'],
    queryFn: async (): Promise<TeamMember[]> => {
      // Fetch user_roles for admins and strategists first
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'strategist']);

      if (rolesError) throw rolesError;
      if (!roles?.length) return [];

      const teamUserIds = [...new Set(roles.map(r => r.user_id))];

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, current_title')
        .in('id', teamUserIds)
        .order('full_name');

      if (profilesError) throw profilesError;
      
      return profiles || [];
    },
    staleTime: 60000,
  });
}
