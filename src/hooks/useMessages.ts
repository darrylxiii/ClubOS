import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'system' | 'ai_generated' | 'escalation';
  is_read: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
  parent_message_id?: string | null;
  reply_count?: number;
  deleted_at?: string | null;
  edited_at?: string | null;
  sender?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  application_id: string;
  title: string;
  status: 'active' | 'muted' | 'closed' | 'archived';
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
  is_pinned?: boolean;
  pinned_at?: string | null;
  archived_at?: string | null;
  application?: {
    company_name: string;
    position: string;
  };
  participants?: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'candidate' | 'hiring_manager' | 'strategist' | 'observer';
  joined_at: string;
  last_read_at: string | null;
  notifications_enabled: boolean;
  is_muted: boolean;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useMessages = (conversationId?: string) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Load conversations for inbox
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get user's conversations
      const { data: convos, error: convosError } = await supabase
        .from('conversations')
        .select(`
          *,
          application:applications(company_name, position),
          participants:conversation_participants(
            *,
            profile:profiles(full_name, avatar_url)
          )
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (convosError) throw convosError;

      // Get last message and unread count for each conversation
      const conversationsWithDetails = await Promise.all(
        (convos || []).map(async (convo) => {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*, sender:profiles!messages_sender_id_fkey(full_name, avatar_url)')
            .eq('conversation_id', convo.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count } = await supabase
            .from('message_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false)
            .in(
              'message_id',
              (
                await supabase
                  .from('messages')
                  .select('id')
                  .eq('conversation_id', convo.id)
              ).data?.map((m) => m.id) || []
            );

          return {
            ...convo,
            last_message: lastMsg,
            unread_count: count || 0,
          };
        })
      );

      setConversations(conversationsWithDetails as unknown as Conversation[]);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load messages for a specific conversation
  const loadMessages = useCallback(async () => {
    if (!conversationId || !user?.id) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(full_name, avatar_url),
          attachments:message_attachments(*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages((data || []) as unknown as Message[]);

      // Mark messages as read
      await supabase
        .from('message_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('message_id', (data || []).map((m) => m.id));
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId, user?.id]);

  // Send a new message
  const sendMessage = useCallback(
    async (content: string, files?: File[]) => {
      if (!conversationId || !user?.id || !content.trim()) return;

      setSending(true);
      try {
        // Insert message
        const { data: newMessage, error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: content.trim(),
            message_type: 'text',
          })
          .select()
          .single();

        if (messageError) throw messageError;

        // Upload attachments if any
        if (files && files.length > 0) {
          for (const file of files) {
            const fileExt = file.name.split('.').pop();
            const filePath = `${conversationId}/${Date.now()}_${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from('message-attachments')
              .upload(filePath, file);

            if (uploadError) throw uploadError;

            await supabase.from('message_attachments').insert({
              message_id: newMessage.id,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              file_size: file.size,
            });
          }
        }

        toast.success('Message sent', {
          description: 'Your message has been delivered',
        });
      } catch (error: any) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      } finally {
        setSending(false);
      }
    },
    [conversationId, user?.id]
  );

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          // Fetch sender details
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .maybeSingle();

          if (conversationId) {
            setMessages((prev) => [...prev, { ...newMessage, sender }]);
          }

          // Reload conversations to update last message
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, conversationId, loadConversations]);

  // Initial load
  useEffect(() => {
    if (conversationId) {
      loadMessages();
    } else {
      loadConversations();
    }
  }, [conversationId, loadMessages, loadConversations]);

  return {
    conversations,
    messages,
    loading,
    sending,
    sendMessage,
    loadConversations,
    loadMessages,
  };
};