

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
      const chronologizedMessages = [...newMessages].reverse();

      setMessages(prev => {
        if (beforeTimestamp) {
          // If loading previous, prepend them
          return [...chronologizedMessages, ...prev];
        } else {
          // Initial load
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
        const newMessage = payload.new as WhatsAppMessage;
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
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
