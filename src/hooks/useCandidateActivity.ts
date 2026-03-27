import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityItem {
  id: string;
  type: 'pipeline_event' | 'interaction';
  eventType: string;
  timestamp: string;
  performedBy?: string;
  performerName?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export function useCandidateActivity(applicationId: string | undefined, candidateId: string | undefined) {
  return useQuery({
    queryKey: ['candidate-activity', applicationId],
    enabled: !!applicationId,
    queryFn: async (): Promise<ActivityItem[]> => {
      const items: ActivityItem[] = [];

      // Fetch pipeline events
      if (applicationId) {
        const { data: events } = await (supabase as any)
          .from('pipeline_events')
          .select('id, event_type, from_stage, to_stage, performed_by, metadata, created_at, profiles!pipeline_events_performed_by_fkey(full_name)')
          .eq('application_id', applicationId)
          .order('created_at', { ascending: false })
          .limit(50);

        for (const e of (events || [])) {
          items.push({
            id: `pe-${e.id}`,
            type: 'pipeline_event',
            eventType: e.event_type,
            timestamp: e.created_at,
            performedBy: e.performed_by,
            performerName: e.profiles?.full_name,
            description: formatEventDescription(e),
            metadata: e.metadata,
          });
        }
      }

      // Fetch candidate interactions
      if (candidateId) {
        const { data: interactions } = await (supabase as any)
          .from('candidate_interactions')
          .select('id, interaction_type, notes, created_at, performed_by, profiles!candidate_interactions_performed_by_fkey(full_name)')
          .eq('candidate_id', candidateId)
          .order('created_at', { ascending: false })
          .limit(30);

        for (const i of (interactions || [])) {
          items.push({
            id: `ci-${i.id}`,
            type: 'interaction',
            eventType: i.interaction_type,
            timestamp: i.created_at,
            performedBy: i.performed_by,
            performerName: i.profiles?.full_name,
            description: formatInteractionDescription(i),
            metadata: { notes: i.notes },
          });
        }
      }

      // Sort by timestamp desc
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return items;
    },
    staleTime: 30_000,
  });
}

function formatEventDescription(event: any): string {
  switch (event.event_type) {
    case 'stage_change': {
      const from = event.from_stage ?? '?';
      const to = event.to_stage ?? '?';
      const auto = event.metadata?.auto_advanced ? ' (auto)' : '';
      return `Moved from stage ${from} to stage ${to}${auto}`;
    }
    case 'status_change': {
      const action = event.metadata?.action || 'updated';
      return `Status changed: ${action}`;
    }
    case 'interview_scheduled': {
      const round = event.metadata?.round_name || 'interview';
      return `Interview scheduled: ${round}`;
    }
    case 'feedback_added':
      return 'Feedback submitted';
    case 'message_sent':
      return 'Email sent to candidate';
    default:
      return event.event_type.replace(/_/g, ' ');
  }
}

function formatInteractionDescription(interaction: any): string {
  switch (interaction.interaction_type) {
    case 'email_sent':
      return 'Email sent';
    case 'call':
      return 'Phone call';
    case 'note':
      return interaction.notes ? `Note: ${interaction.notes.slice(0, 80)}` : 'Note added';
    case 'meeting':
      return 'Meeting held';
    default:
      return interaction.interaction_type?.replace(/_/g, ' ') || 'Activity';
  }
}
