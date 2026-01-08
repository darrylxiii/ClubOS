import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CandidateContext {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  talent_tier: string | null;
  current_title: string | null;
  current_company: string | null;
  profile_completion: number | null;
}

export function useWhatsAppCandidateContext(candidateId: string | null) {
  const { data: candidate, isLoading } = useQuery({
    queryKey: ['whatsapp-candidate-context', candidateId],
    queryFn: async () => {
      if (!candidateId) return null;

      const { data, error } = await supabase
        .from('candidate_profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          avatar_url,
          talent_tier,
          current_title,
          current_company,
          profile_completion
        `)
        .eq('id', candidateId)
        .single();

      if (error) {
        console.error('Error fetching candidate context:', error);
        return null;
      }

      return data as unknown as CandidateContext;
    },
    enabled: !!candidateId,
    staleTime: 60000,
  });

  return { candidate, loading: isLoading };
}
