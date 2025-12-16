import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppConversation {
  id: string;
  account_id: string;
  candidate_id: string | null;
  candidate_phone: string;
  candidate_name: string | null;
  profile_picture_url: string | null;
  conversation_status: string;
  messaging_window_expires_at: string | null;
  assigned_strategist_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_direction: string | null;
  unread_count: number;
  is_pinned: boolean;
  tags: string[];
  created_at: string;
}

export function useWhatsAppConversations() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (conversationId: string) => {
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);

    if (!error) {
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
      );
    }
  };

  const assignStrategist = async (conversationId: string, strategistId: string) => {
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ assigned_strategist_id: strategistId })
      .eq('id', conversationId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to assign strategist', variant: 'destructive' });
    } else {
      await fetchConversations();
    }
  };

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel('whatsapp_conversations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { conversations, loading, refetch: fetchConversations, markAsRead, assignStrategist };
}
