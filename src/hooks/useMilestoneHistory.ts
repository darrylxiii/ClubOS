import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TimelineEvent {
  id: string;
  type: 'unlock' | 'proposal' | 'decision' | 'reward';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: {
    status?: string;
    amount?: number;
    milestoneName?: string;
  };
}

export const useMilestoneHistory = (limit = 50) => {
  return useQuery({
    queryKey: ['milestone-history', limit],
    queryFn: async () => {
      const events: TimelineEvent[] = [];

      // 1. Fetch milestone celebrations (unlocks)
      const { data: celebrations, error: celebrationsError } = await supabase
        .from('milestone_celebrations')
        .select(`
          id,
          celebration_type,
          celebration_data,
          created_at,
          revenue_milestones!inner (
            display_name,
            threshold_amount
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (celebrationsError) {
        console.error('Error fetching celebrations:', celebrationsError);
      } else {
        (celebrations || []).forEach((c: any) => {
          events.push({
            id: `celebration-${c.id}`,
            type: 'unlock',
            title: c.revenue_milestones?.display_name || 'Milestone Unlocked',
            description: `Achieved ${new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(c.celebration_data?.achieved_revenue || 0)} revenue`,
            timestamp: c.created_at,
            metadata: {
              milestoneName: c.revenue_milestones?.display_name,
              amount: c.celebration_data?.threshold,
            },
          });
        });
      }

      // 2. Fetch reward proposals
      const { data: proposals, error: proposalsError } = await supabase
        .from('reward_proposals')
        .select(`
          id,
          title,
          description,
          estimated_cost,
          status,
          created_at,
          revenue_milestones!inner (
            display_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (proposalsError) {
        console.error('Error fetching proposals:', proposalsError);
      } else {
        (proposals || []).forEach((p: any) => {
          events.push({
            id: `proposal-${p.id}`,
            type: 'proposal',
            title: p.title,
            description: p.description || `Proposal for ${p.revenue_milestones?.display_name}`,
            timestamp: p.created_at,
            metadata: {
              amount: p.estimated_cost,
              milestoneName: p.revenue_milestones?.display_name,
              status: p.status,
            },
          });
        });
      }

      // 3. Fetch reward decisions
      const { data: decisions, error: decisionsError } = await supabase
        .from('reward_decisions')
        .select(`
          id,
          decision,
          reason,
          approved_amount,
          created_at,
          reward_proposals!inner (
            title,
            revenue_milestones!inner (
              display_name
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (decisionsError) {
        console.error('Error fetching decisions:', decisionsError);
      } else {
        (decisions || []).forEach((d: any) => {
          const statusMap: Record<string, string> = {
            approve: 'approved',
            reject: 'rejected',
            defer: 'deferred',
            modify: 'modified',
          };

          events.push({
            id: `decision-${d.id}`,
            type: 'decision',
            title: d.reward_proposals?.title || 'Reward Decision',
            description: d.reason || `Decision for ${d.reward_proposals?.revenue_milestones?.display_name}`,
            timestamp: d.created_at,
            metadata: {
              status: statusMap[d.decision] || d.decision,
              amount: d.approved_amount,
              milestoneName: d.reward_proposals?.revenue_milestones?.display_name,
            },
          });
        });
      }

      // 4. Fetch agent events for milestone unlocks (additional context)
      const { data: agentEvents, error: agentError } = await supabase
        .from('agent_events')
        .select('id, event_type, event_data, created_at')
        .eq('event_type', 'milestone.unlocked')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (agentError) {
        console.error('Error fetching agent events:', agentError);
      }
      // Agent events are supplementary - celebrations already cover unlocks

      // Sort all events by timestamp descending
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Return limited results
      return events.slice(0, limit);
    },
  });
};
