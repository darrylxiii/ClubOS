import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StrategistWorkload {
  id: string;
  user_id: string;
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

const MAX_COMPANY_CAPACITY = 25;
const MAX_CANDIDATE_CAPACITY = 50;

export function useStrategistWorkload() {
  return useQuery({
    queryKey: ['strategist-workload'],
    queryFn: async (): Promise<StrategistWorkload[]> => {
      // Fetch all active strategists from talent_strategists
      const { data: strategists, error: strategistsError } = await (supabase as any)
        .from('talent_strategists')
        .select('id, user_id, full_name, title, email, photo_url')
        .eq('is_active', true);

      if (strategistsError) throw strategistsError;
      if (!strategists?.length) return [];

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

      // Calculate workload for each strategist
      const workloadMap: StrategistWorkload[] = strategists.map((strategist: any) => {
        const companyCount = companyAssignments?.filter(
          (a: any) => a.strategist_id === strategist.user_id
        ).length || 0;

        const assignedCandidates = candidates?.filter(
          (c: any) => c.assigned_strategist_id === strategist.user_id
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
          id: strategist.id,
          user_id: strategist.user_id,
          full_name: strategist.full_name || 'Unknown',
          avatar_url: strategist.photo_url,
          email: strategist.email,
          title: strategist.title,
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
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('talent_strategists')
        .select('id, user_id, full_name, title, email, photo_url, availability')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });
}
