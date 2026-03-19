import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resolves the candidate_profiles.id for a given auth user_id.
 * This is needed because applications created by admins use candidate_profiles.id
 * as candidate_id, which differs from the auth user UUID.
 */
export function useCandidateProfileId(userId: string | undefined) {
  return useQuery({
    queryKey: ['candidate-profile-id', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('user_id', userId!)
        .maybeSingle();
      return data?.id || null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Builds the .or() filter string for application queries that need to match
 * both direct applications (user_id) and admin-sourced applications (candidate_id).
 */
export function buildApplicationOrFilter(userId: string, candidateProfileId: string | null): string {
  if (candidateProfileId) {
    return `user_id.eq.${userId},candidate_id.eq.${candidateProfileId}`;
  }
  return `user_id.eq.${userId}`;
}
