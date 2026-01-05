import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Touchpoint {
  id: string;
  candidate_id: string;
  strategist_id: string;
  touchpoint_type: string;
  subject: string | null;
  summary: string | null;
  sentiment: string | null;
  job_context_id: string | null;
  requires_response: boolean;
  response_status: string | null;
  response_received_at: string | null;
  follow_up_date: string | null;
  created_at: string;
}

export function useTouchpoints(candidateId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const touchpointsQuery = useQuery({
    queryKey: ['touchpoints', candidateId],
    queryFn: async () => {
      if (!candidateId) return [];

      // For now, return empty touchpoints - would come from a dedicated table
      return [] as Touchpoint[];
    },
    enabled: !!candidateId && !!user?.id,
  });

  const logTouchpointMutation = useMutation({
    mutationFn: async (data: {
      candidateId: string;
      type: string;
      subject?: string;
      summary?: string;
      sentiment?: string;
      jobContextId?: string;
      requiresResponse?: boolean;
      followUpDate?: Date;
    }) => {
      // Check for existing relationship
      const { data: relationships, error: fetchError } = await supabase
        .from('candidate_relationships')
        .select('id, candidate_id, primary_strategist_id')
        .eq('candidate_id', data.candidateId)
        .eq('primary_strategist_id', user!.id)
        .limit(1);

      if (fetchError) throw fetchError;

      const relationship = relationships?.[0];

      if (relationship) {
        // Update existing relationship
        const { error } = await supabase
          .from('candidate_relationships')
          .update({
            last_meaningful_contact: new Date().toISOString(),
            next_action_date: data.followUpDate?.toISOString() || null,
            relationship_notes: data.summary,
          })
          .eq('id', relationship.id);

        if (error) throw error;
      } else {
        // Create new relationship
        const { error } = await supabase
          .from('candidate_relationships')
          .insert({
            candidate_id: data.candidateId,
            primary_strategist_id: user!.id,
            relationship_strength: 'warming',
            last_meaningful_contact: new Date().toISOString(),
            next_action_date: data.followUpDate?.toISOString() || null,
            relationship_notes: data.summary,
          });

        if (error) throw error;
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['touchpoints', variables.candidateId] });
      queryClient.invalidateQueries({ queryKey: ['candidate-relationship'] });
      toast.success('Touchpoint logged');
    },
    onError: (error) => {
      toast.error('Failed to log touchpoint');
      console.error(error);
    },
  });

  return {
    touchpoints: touchpointsQuery.data || [],
    isLoading: touchpointsQuery.isLoading,
    logTouchpoint: logTouchpointMutation.mutateAsync,
    isLogging: logTouchpointMutation.isPending,
  };
}

export function useCandidateRelationship(candidateId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['candidate-relationship', candidateId, user?.id],
    queryFn: async () => {
      if (!candidateId) return null;

      const { data, error } = await supabase
        .from('candidate_relationships')
        .select('*')
        .eq('candidate_id', candidateId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!candidateId && !!user?.id,
  });
}
