import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TalentTier = 'hot' | 'warm' | 'strategic' | 'pool' | 'dormant' | 'excluded';
export type AvailabilityStatus = 'actively_looking' | 'passively_open' | 'not_looking' | 'employed_happy' | 'unknown';

export interface TalentPoolFilters {
  tiers?: TalentTier[];
  industries?: string[];
  seniorityLevels?: string[];
  locations?: string[];
  minMoveProbability?: number;
  ownerId?: string;
  needsAttention?: boolean;
  searchQuery?: string;
}

export interface TalentPoolCandidate {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  current_title: string | null;
  current_company: string | null;
  location: string | null;
  years_of_experience: number | null;
  linkedin_url: string | null;
  talent_tier: TalentTier;
  tier_score: number | null;
  move_probability: number | null;
  availability_status: AvailabilityStatus | null;
  industries: string[] | null;
  functions: string[] | null;
  seniority_level: string | null;
  profile_completeness: number | null;
  last_activity_at: string | null;
  owned_by_strategist_id: string | null;
  avatar_url?: string | null;
  skills?: string[] | null;
  ai_summary?: string | null;
  relationship?: {
    warmth_score: number | null;
    relationship_strength: string | null;
    last_meaningful_contact: string | null;
    response_rate: number | null;
  } | null;
}

export interface TalentPoolStats {
  total: number;
  hot: number;
  warm: number;
  strategic: number;
  pool: number;
  dormant: number;
  highMoveProbability: number;
  needsAttention: number;
}

const PAGE_SIZE = 50;

export function useTalentPool(filters: TalentPoolFilters = {}) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['talent-pool', filters],
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from('candidate_profiles')
        .select(`
          id,
          user_id,
          full_name,
          email,
          phone,
          current_title,
          current_company,
          location,
          years_of_experience,
          linkedin_url,
          talent_tier,
          tier_score,
          move_probability,
          availability_status,
          industries,
          functions,
          seniority_level,
          profile_completeness,
          last_activity_at,
          owned_by_strategist_id,
          skills,
          ai_summary,
          candidate_relationships (
            warmth_score,
            relationship_strength,
            last_meaningful_contact,
            response_rate
          )
        `)
        .eq('gdpr_consent', true)
        .is('data_deletion_requested', false)
        .neq('talent_tier', 'excluded')
        .order('tier_score', { ascending: false });

      // Apply filters
      if (filters.tiers && filters.tiers.length > 0) {
        query = query.in('talent_tier', filters.tiers);
      }
      if (filters.industries && filters.industries.length > 0) {
        query = query.overlaps('industries', filters.industries);
      }
      if (filters.seniorityLevels && filters.seniorityLevels.length > 0) {
        query = query.in('seniority_level', filters.seniorityLevels);
      }
      if (filters.locations && filters.locations.length > 0) {
        query = query.or(filters.locations.map(loc => `location.ilike.%${loc}%`).join(','));
      }
      if (filters.minMoveProbability !== undefined) {
        query = query.gte('move_probability', filters.minMoveProbability);
      }
      if (filters.ownerId) {
        query = query.eq('owned_by_strategist_id', filters.ownerId);
      }
      if (filters.searchQuery) {
        query = query.or(`full_name.ilike.%${filters.searchQuery}%,current_title.ilike.%${filters.searchQuery}%,current_company.ilike.%${filters.searchQuery}%`);
      }

      // Cursor-based pagination using tier_score and id
      if (pageParam) {
        query = query.or(`tier_score.lt.${pageParam.tierScore},and(tier_score.eq.${pageParam.tierScore},id.gt.${pageParam.id})`);
      }

      const { data, error } = await query.limit(PAGE_SIZE);

      if (error) throw error;

      const candidates = (data || []).map((candidate: any) => ({
        ...candidate,
        relationship: candidate.candidate_relationships?.[0] || null,
      })) as TalentPoolCandidate[];

      // Determine next cursor
      const lastCandidate = candidates[candidates.length - 1];
      const nextCursor = candidates.length === PAGE_SIZE && lastCandidate
        ? { tierScore: lastCandidate.tier_score ?? 0, id: lastCandidate.id }
        : null;

      return { candidates, nextCursor };
    },
    initialPageParam: null as { tierScore: number; id: string } | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Flatten paginated candidates
  const candidates = data?.pages.flatMap((page) => page.candidates) ?? [];

  // Optimized stats query using aggregation
  const { data: stats } = useQuery({
    queryKey: ['talent-pool-stats'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

      // Run count queries in parallel for performance
      const [
        { count: total },
        { count: hot },
        { count: warm },
        { count: strategic },
        { count: pool },
        { count: dormant },
        { count: highMoveProbability },
        { count: needsAttention },
      ] = await Promise.all([
        supabase.from('candidate_profiles').select('*', { count: 'exact', head: true })
          .eq('gdpr_consent', true).is('data_deletion_requested', false).neq('talent_tier', 'excluded'),
        supabase.from('candidate_profiles').select('*', { count: 'exact', head: true })
          .eq('gdpr_consent', true).is('data_deletion_requested', false).eq('talent_tier', 'hot'),
        supabase.from('candidate_profiles').select('*', { count: 'exact', head: true })
          .eq('gdpr_consent', true).is('data_deletion_requested', false).eq('talent_tier', 'warm'),
        supabase.from('candidate_profiles').select('*', { count: 'exact', head: true })
          .eq('gdpr_consent', true).is('data_deletion_requested', false).eq('talent_tier', 'strategic'),
        supabase.from('candidate_profiles').select('*', { count: 'exact', head: true })
          .eq('gdpr_consent', true).is('data_deletion_requested', false).eq('talent_tier', 'pool'),
        supabase.from('candidate_profiles').select('*', { count: 'exact', head: true })
          .eq('gdpr_consent', true).is('data_deletion_requested', false).eq('talent_tier', 'dormant'),
        supabase.from('candidate_profiles').select('*', { count: 'exact', head: true })
          .eq('gdpr_consent', true).is('data_deletion_requested', false).gte('move_probability', 70),
        supabase.from('candidate_profiles').select('*', { count: 'exact', head: true })
          .eq('gdpr_consent', true).is('data_deletion_requested', false)
          .in('talent_tier', ['hot', 'warm'])
          .or(`last_activity_at.is.null,last_activity_at.lt.${thirtyDaysAgoISO}`),
      ]);

      return {
        total: total ?? 0,
        hot: hot ?? 0,
        warm: warm ?? 0,
        strategic: strategic ?? 0,
        pool: pool ?? 0,
        dormant: dormant ?? 0,
        highMoveProbability: highMoveProbability ?? 0,
        needsAttention: needsAttention ?? 0,
      } as TalentPoolStats;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const updateTierMutation = useMutation({
    mutationFn: async ({ candidateId, tier, reason }: { candidateId: string; tier: TalentTier; reason?: string }) => {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({
          talent_tier: tier,
          tier_updated_at: new Date().toISOString(),
          tier_update_reason: reason,
        })
        .eq('id', candidateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talent-pool'] });
      queryClient.invalidateQueries({ queryKey: ['talent-pool-stats'] });
      toast.success('Candidate tier updated');
    },
    onError: (error) => {
      toast.error('Failed to update tier: ' + error.message);
    },
  });

  const assignOwnerMutation = useMutation({
    mutationFn: async ({ candidateId, ownerId }: { candidateId: string; ownerId: string }) => {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({
          owned_by_strategist_id: ownerId,
          ownership_assigned_at: new Date().toISOString(),
        })
        .eq('id', candidateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talent-pool'] });
      toast.success('Owner assigned');
    },
    onError: (error) => {
      toast.error('Failed to assign owner: ' + error.message);
    },
  });

  return {
    candidates,
    stats: stats || {
      total: 0,
      hot: 0,
      warm: 0,
      strategic: 0,
      pool: 0,
      dormant: 0,
      highMoveProbability: 0,
      needsAttention: 0,
    },
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    updateTier: updateTierMutation.mutate,
    assignOwner: assignOwnerMutation.mutate,
    isUpdatingTier: updateTierMutation.isPending,
  };
}

export function useSemanticSearch() {
  const queryClient = useQueryClient();

  const searchMutation = useMutation({
    mutationFn: async ({ query, filters }: { query: string; filters?: TalentPoolFilters }) => {
      const { data, error } = await supabase.functions.invoke('enhance-semantic-candidate-search', {
        body: {
          query,
          filters: {
            talent_tiers: filters?.tiers,
            industries: filters?.industries,
            seniority_levels: filters?.seniorityLevels,
            locations: filters?.locations,
            min_move_probability: filters?.minMoveProbability,
          },
          limit: 50,
          include_explanation: true,
        },
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      toast.error('Search failed: ' + error.message);
    },
  });

  return {
    search: searchMutation.mutate,
    searchAsync: searchMutation.mutateAsync,
    results: searchMutation.data?.candidates || [],
    lastQuery: searchMutation.variables?.query || '',
    isSearching: searchMutation.isPending,
    error: searchMutation.error,
    clearResults: () => searchMutation.reset(),
  };
}

export function useMoveProbability(candidateId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['move-probability', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('move_probability, move_probability_factors, move_probability_updated_at')
        .eq('id', candidateId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!candidateId,
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculate-move-probability', {
        body: { candidate_id: candidateId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['move-probability', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['talent-pool'] });
      toast.success('Move probability recalculated');
    },
    onError: (error) => {
      toast.error('Failed to recalculate: ' + error.message);
    },
  });

  return {
    moveProbability: data?.move_probability || 0,
    factors: data?.move_probability_factors || {},
    updatedAt: data?.move_probability_updated_at,
    isLoading,
    recalculate: recalculateMutation.mutate,
    isRecalculating: recalculateMutation.isPending,
  };
}
