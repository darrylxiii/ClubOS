import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface ConversationEvent {
  id: string;
  conversation_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
}

export function useWhatsAppConversationEvents(conversationId: string | null) {
  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['whatsapp-conversation-events', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_conversation_events')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching conversation events:', error);
        return [];
      }

      return data as ConversationEvent[];
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation-events-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_conversation_events',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, refetch]);

  return { events: events || [], loading: isLoading, refetch };
}

export async function logConversationEvent(
  conversationId: string,
  eventType: string,
  eventData: Record<string, string | number | boolean> = {},
  actorId?: string
) {
  const { error } = await supabase
    .from('whatsapp_conversation_events')
    .insert([{
      conversation_id: conversationId,
      event_type: eventType,
      event_data: eventData,
      actor_id: actorId || null,
    }]);

  if (error) {
    console.error('Error logging conversation event:', error);
  }
}
