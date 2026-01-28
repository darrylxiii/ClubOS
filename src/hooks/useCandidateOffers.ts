import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { notify } from '@/lib/notify';

export interface CandidateOffer {
  id: string;
  candidate_id: string;
  job_id: string | null;
  application_id: string | null;
  base_salary: number | null;
  bonus_percentage: number | null;
  equity_percentage: number | null;
  total_compensation: number | null;
  salary_percentile: number | null;
  market_competitiveness_score: number | null;
  ai_recommendation: {
    summary?: string;
    risk_factors?: string[];
    negotiation_tips?: string[];
  } | null;
  benchmark_comparison: {
    min?: number;
    max?: number;
    median?: number;
  } | null;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'negotiating' | 'expired' | null;
  sent_at: string | null;
  responded_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Joined data
  job?: {
    id: string;
    title: string;
    location: string | null;
    company_id: string | null;
    companies?: {
      id: string;
      name: string;
      logo_url: string | null;
    };
  };
}

export interface OfferStats {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  negotiating: number;
  avgCompensation: number;
  highestOffer: number;
}

export function useCandidateOffers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get candidate profile ID for the current user
  const { data: candidateProfile } = useQuery({
    queryKey: ['candidate-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const candidateId = candidateProfile?.id;

  // Fetch all offers for the candidate
  const { data: offers, isLoading, error, refetch } = useQuery({
    queryKey: ['candidate-offers', candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      
      const { data, error } = await supabase
        .from('candidate_offers')
        .select(`
          *,
          job:jobs(
            id,
            title,
            location,
            company_id,
            companies(id, name, logo_url)
          )
        `)
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as CandidateOffer[];
    },
    enabled: !!candidateId,
  });

  // Calculate stats
  const stats: OfferStats = {
    total: offers?.length || 0,
    pending: offers?.filter(o => o.status === 'sent' || o.status === 'viewed').length || 0,
    accepted: offers?.filter(o => o.status === 'accepted').length || 0,
    declined: offers?.filter(o => o.status === 'declined').length || 0,
    negotiating: offers?.filter(o => o.status === 'negotiating').length || 0,
    avgCompensation: offers?.length 
      ? offers.reduce((sum, o) => sum + (o.total_compensation || 0), 0) / offers.length 
      : 0,
    highestOffer: offers?.reduce((max, o) => Math.max(max, o.total_compensation || 0), 0) || 0,
  };

  // Update offer status
  const updateOfferStatus = useMutation({
    mutationFn: async ({ offerId, status }: { offerId: string; status: string }) => {
      const { data, error } = await supabase
        .from('candidate_offers')
        .update({ 
          status,
          responded_at: ['accepted', 'declined'].includes(status) ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-offers', candidateId] });
      notify.success('Offer status updated');
    },
    onError: (error: Error) => {
      notify.error(`Failed to update offer: ${error.message}`);
    },
  });

  // Accept offer
  const acceptOffer = (offerId: string) => {
    return updateOfferStatus.mutate({ offerId, status: 'accepted' });
  };

  // Decline offer
  const declineOffer = (offerId: string) => {
    return updateOfferStatus.mutate({ offerId, status: 'declined' });
  };

  // Start negotiation
  const startNegotiation = (offerId: string) => {
    return updateOfferStatus.mutate({ offerId, status: 'negotiating' });
  };

  return {
    offers: offers || [],
    stats,
    isLoading,
    error,
    refetch,
    acceptOffer,
    declineOffer,
    startNegotiation,
    candidateId,
  };
}

// Hook for single offer detail
export function useCandidateOffer(offerId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['candidate-offer', offerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_offers')
        .select(`
          *,
          job:jobs(
            id,
            title,
            location,
            company_id,
            companies(id, name, logo_url)
          )
        `)
        .eq('id', offerId)
        .single();

      if (error) throw error;
      return data as CandidateOffer;
    },
    enabled: !!offerId && !!user?.id,
  });
}
