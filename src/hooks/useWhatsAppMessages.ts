

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import { communicationsService } from '@/services/communicationsService';

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
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 50;

  const fetchMessages = useCallback(async (beforeTimestamp?: string) => {
    if (!conversationId) return;

    try {
      if (beforeTimestamp) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setHasMore(true); // Reset on initial load
      }

      let query = supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false }) // Get latest first
        .limit(PAGE_SIZE);

      if (beforeTimestamp) {
        query = query.lt('created_at', beforeTimestamp);
      }

      const { data, error } = await query;

      if (error) throw error;

      const newMessages = data || [];
      const hasNextPage = newMessages.length === PAGE_SIZE;
      setHasMore(hasNextPage);

      // We fetched latest first (desc), so reverse to get chronological (asc) for display
      const chronologizedMessages = [...newMessages].reverse().map(m => ({
        id: m.id,
        conversation_id: m.conversation_id ?? '',
        direction: m.direction ?? 'outbound',
        message_type: m.message_type ?? 'text',
        content: m.content,
        template_name: m.template_name,
        media_url: m.media_url,
        status: m.status ?? 'pending',
        sentiment_score: m.sentiment_score,
        intent_classification: m.intent_classification,
        created_at: m.created_at ?? new Date().toISOString(),
      })) as WhatsAppMessage[];

      setMessages(prev => {
        if (beforeTimestamp) {
          return [...chronologizedMessages, ...prev];
        } else {
          return chronologizedMessages;
        }
      });

    } catch (error) {
      console.error('Error fetching messages:', error);
      notify.error('Error', { description: 'Failed to load conversation history' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversationId]);

  const loadMore = () => {
    if (!loadingMore && hasMore && messages.length > 0) {
      const oldestMessage = messages[0];
      fetchMessages(oldestMessage.created_at);
    }
  };

  const sendMessage = async (content: string, messageType: 'text' | 'template' = 'text', templateName?: string, templateParams?: Record<string, string>[]) => {
    if (!conversationId) return;

    try {
      setSending(true);
      const data = await communicationsService.sendWhatsapp({
        conversationId,
        messageType,
        content,
        templateName,
        templateParams,
      });

      if (!data.success) throw new Error(data.error || 'Failed to send message');

      // We rely on the realtime subscription to add the message to the list
      // But we can also optimistic add if needed, skipping for now to rely on single source of truth (UseEffect below)
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      notify.error('Error', { description: message });
      throw error;
    } finally {
      setSending(false);
    }
  };

  // Initial load
  useEffect(() => {
    setMessages([]); // Clear on convo change
    fetchMessages();
  }, [conversationId, fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`whatsapp_messages_${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        const raw = payload.new;
        const newMessage: WhatsAppMessage = {
          id: raw.id as string,
          conversation_id: (raw.conversation_id as string) ?? '',
          direction: (raw.direction as string) ?? 'outbound',
          message_type: (raw.message_type as string) ?? 'text',
          content: raw.content as string | null,
          template_name: raw.template_name as string | null,
          media_url: raw.media_url as string | null,
          status: (raw.status as string) ?? 'pending',
          sentiment_score: raw.sentiment_score as number | null,
          intent_classification: raw.intent_classification as string | null,
          created_at: (raw.created_at as string) ?? new Date().toISOString(),
        };
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    refetch: () => fetchMessages(),
    loadMore,
    hasMore,
    loadingMore
  };
}
