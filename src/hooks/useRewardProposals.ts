import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface RewardProposal {
  id: string;
  milestone_id: string;
  proposed_by: string;
  category: string;
  title: string;
  description: string;
  estimated_cost: number;
  rationale: string | null;
  impact_type: string[];
  status: string;
  voting_deadline: string | null;
  vote_count_support: number;
  vote_count_neutral: number;
  vote_count_concern: number;
  created_at: string;
  submitted_at: string | null;
}

export interface ProposalVote {
  id: string;
  proposal_id: string;
  user_id: string;
  vote_type: string;
  comment: string | null;
  created_at: string;
}

export function useRewardProposals(milestoneId?: string) {
  return useQuery({
    queryKey: ['reward-proposals', milestoneId],
    queryFn: async () => {
      let query = supabase.from('reward_proposals').select('*').order('created_at', { ascending: false });
      if (milestoneId) query = query.eq('milestone_id', milestoneId);
      const { data, error } = await query;
      if (error) throw error;
      return data as RewardProposal[];
    }
  });
}

export function useProposalVotes(proposalId: string) {
  return useQuery({
    queryKey: ['proposal-votes', proposalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_votes')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProposalVote[];
    },
    enabled: !!proposalId
  });
}

export function useMyVote(proposalId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-vote', proposalId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('proposal_votes')
        .select('*')
        .eq('proposal_id', proposalId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as ProposalVote | null;
    },
    enabled: !!proposalId && !!user?.id
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (proposal: {
      milestone_id: string;
      category: string;
      title: string;
      description: string;
      estimated_cost: number;
      rationale?: string;
      impact_type?: string[];
    }) => {
      const { data, error } = await supabase
        .from('reward_proposals')
        .insert([{ ...proposal, proposed_by: user?.id || '', status: 'draft' }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-proposals'] });
      toast.success('Proposal saved as draft');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

export function useSubmitProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (proposalId: string) => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);
      const { data, error } = await supabase
        .from('reward_proposals')
        .update({ status: 'voting', submitted_at: new Date().toISOString(), voting_deadline: deadline.toISOString() })
        .eq('id', proposalId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-proposals'] });
      toast.success('Proposal submitted for voting');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

export function useCastVote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ proposalId, voteType, comment }: { proposalId: string; voteType: string; comment?: string }) => {
      const { data, error } = await supabase
        .from('proposal_votes')
        .upsert([{ proposal_id: proposalId, user_id: user?.id || '', vote_type: voteType, comment }], { onConflict: 'proposal_id,user_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-votes', variables.proposalId] });
      queryClient.invalidateQueries({ queryKey: ['my-vote', variables.proposalId] });
      queryClient.invalidateQueries({ queryKey: ['reward-proposals'] });
      toast.success('Vote recorded');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}

export function useCreateDecision() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (decision: {
      milestone_id: string;
      proposal_id?: string;
      decision: string;
      rationale: string;
      approved_amount?: number;
    }) => {
      const { data, error } = await supabase
        .from('reward_decisions')
        .insert([{ ...decision, decided_by: user?.id || '' }])
        .select()
        .single();
      if (error) throw error;
      if (decision.proposal_id) {
        await supabase.from('reward_proposals').update({ status: 'decided' }).eq('id', decision.proposal_id);
      }
      if (decision.decision === 'approved') {
        await supabase.from('revenue_milestones').update({ status: 'rewarded', rewarded_at: new Date().toISOString() }).eq('id', decision.milestone_id);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-decisions'] });
      queryClient.invalidateQueries({ queryKey: ['reward-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-milestones'] });
      toast.success('Decision recorded');
    },
    onError: (error: Error) => toast.error(error.message)
  });
}
