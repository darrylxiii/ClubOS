import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DMConversation {
  id: string;
  participant_one: string;
  participant_two: string;
  last_message_at: string | null;
  created_at: string;
  other_participant?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  unread_count?: number;
}

interface DMMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachments: any;
  is_read: boolean;
  created_at: string;
  sender?: any;
}

export function useDirectMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [messages, setMessages] = useState<Record<string, DMMessage[]>>({});
  const [loading, setLoading] = useState(true);

  // Load all conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dm_conversations')
        .select(`
          *,
          dm_messages!inner(created_at)
        `)
        .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Load participant profiles
      const conversationsWithProfiles = await Promise.all(
        data.map(async (conv) => {
          const otherUserId = conv.participant_one === user.id 
            ? conv.participant_two 
            : conv.participant_one;

          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', otherUserId)
            .single();

          // Count unread messages
          const { count } = await supabase
            .from('dm_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          return {
            ...conv,
            other_participant: profile,
            unread_count: count || 0,
          };
        })
      );

      setConversations(conversationsWithProfiles);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('dm_messages')
        .select(`
          *,
          sender:profiles!sender_id(full_name, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages((prev) => ({
        ...prev,
        [conversationId]: data,
      }));

      // Mark messages as read
      await supabase
        .from('dm_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user?.id)
        .eq('is_read', false);

    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  }, [user]);

  // Create or get conversation with a user
  const getOrCreateConversation = useCallback(async (otherUserId: string) => {
    if (!user) return null;

    try {
      // Ensure participant order (lower UUID first)
      const [p1, p2] = [user.id, otherUserId].sort();

      // Check if conversation exists
      const { data: existing, error: fetchError } = await supabase
        .from('dm_conversations')
        .select('*')
        .eq('participant_one', p1)
        .eq('participant_two', p2)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existing) return existing.id;

      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('dm_conversations')
        .insert({
          participant_one: p1,
          participant_two: p2,
        })
        .select()
        .single();

      if (createError) throw createError;

      await loadConversations();
      return newConv.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
      return null;
    }
  }, [user, loadConversations]);

  // Send a message
  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    attachments: any[] = []
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('dm_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          attachments,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  }, [user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    loadConversations();

    // Subscribe to new conversations
    const conversationsChannel = supabase
      .channel('dm_conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dm_conversations',
          filter: `or(participant_one.eq.${user.id},participant_two.eq.${user.id})`,
        },
        () => loadConversations()
      )
      .subscribe();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('dm_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dm_messages',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as DMMessage;
            setMessages((prev) => ({
              ...prev,
              [newMessage.conversation_id]: [
                ...(prev[newMessage.conversation_id] || []),
                newMessage,
              ],
            }));
            loadConversations(); // Refresh to update last_message_at
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user, loadConversations]);

  return {
    conversations,
    messages,
    loading,
    loadMessages,
    sendMessage,
    getOrCreateConversation,
  };
}
