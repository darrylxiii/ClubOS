import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  direction: string;
  message_type: string;
  content: string | null;
  template_name: string | null;
  media_url: string | null;
  status: string;
  sentiment_score: number | null;
  intent_classification: string | null;
  created_at: string;
}

export function useWhatsAppMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    if (!conversationId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string, messageType: 'text' | 'template' = 'text', templateName?: string, templateParams?: Record<string, string>[]) => {
    if (!conversationId) return;

    try {
      setSending(true);
      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          conversationId,
          messageType,
          content,
          templateName,
          templateParams,
        },
      });

      if (error) throw error;
      await fetchMessages();
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      notify.error('Error', { description: message });
      throw error;
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    if (conversationId) {
      const channel = supabase
        .channel(`whatsapp_messages_${conversationId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`
        }, () => {
          fetchMessages();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [conversationId]);

  return { messages, loading, sending, sendMessage, refetch: fetchMessages };
}
