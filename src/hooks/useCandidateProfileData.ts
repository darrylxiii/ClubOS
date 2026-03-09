import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Use Record<string, unknown> to avoid strict Json type issues with dynamic candidate fields
export type CandidateProfileData = Record<string, unknown> & {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  current_title: string | null;
  current_company: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
};

export type UserProfileData = Record<string, unknown> & {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

interface UseCandidateProfileDataOptions {
  candidateId: string | undefined;
  isTeamView: boolean;
  userId?: string;
  role?: string;
}

export function useCandidateProfileData({ candidateId, isTeamView, userId, role }: UseCandidateProfileDataOptions) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['candidate-profile', candidateId],
    queryFn: async () => {
      if (!candidateId) throw new Error('No candidate ID');

      const { data: candidateData, error } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', candidateId)
        .maybeSingle();

      if (error) throw error;
      if (!candidateData) return { candidate: null, userProfile: null };

      let userProfile: UserProfileData | null = null;
      if (candidateData.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', candidateData.user_id)
          .maybeSingle();
        userProfile = profileData;
      }

      // Track profile view for team members
      if (isTeamView && userId) {
        supabase.from('candidate_profile_views').insert({
          candidate_id: candidateId,
          viewer_id: userId,
          view_context: 'full_profile',
          view_source: 'candidate_profile_page',
        }).then(() => {});
      }

      return { candidate: candidateData as CandidateProfileData, userProfile };
    },
    enabled: !!candidateId,
    staleTime: 30_000,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['candidate-profile', candidateId] });
  };

  return {
    candidate: query.data?.candidate ?? null,
    userProfile: query.data?.userProfile ?? null,
    loading: query.isLoading,
    refetch,
  };
}
