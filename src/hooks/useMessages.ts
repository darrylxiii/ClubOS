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
  read_at?: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  parent_message_id?: string | null;
  reply_count?: number;
  deleted_at?: string | null;
  edited_at?: string | null;
  priority?: string;
  is_urgent?: boolean;
  sentiment_score?: number;
  media_type?: string;
  media_url?: string;
  media_duration?: number;
  gif_url?: string;
  sticker_url?: string;
  pinned_at?: string | null;
  pinned_by?: string | null;
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
  const [typingUsers, setTypingUsers] = useState<Array<{
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>>([]);

  // Load conversations for inbox
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get user's conversations through participants
      const { data: userParticipations, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantsError) throw participantsError;

      if (!userParticipations || userParticipations.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = userParticipations.map(p => p.conversation_id);

      const { data: convos, error: convosError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (convosError) throw convosError;

      // Get last message, participants, and unread count for each conversation
      const conversationsWithDetails = await Promise.all(
        (convos || []).map(async (convo) => {
          // Get participants with profiles
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id, role')
            .eq('conversation_id', convo.id);

          const participantIds = participants?.map(p => p.user_id) || [];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', participantIds);

          const participantsWithProfiles = participants?.map(p => ({
            ...p,
            profile: profiles?.find(prof => prof.id === p.user_id)
          }));

          // Get last message with sender
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convo.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let lastMessageWithSender: Message | null = null;
          if (lastMsg) {
            const { data: sender } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', lastMsg.sender_id)
              .maybeSingle();
            lastMessageWithSender = { 
              ...lastMsg as any,
              sender: sender || undefined
            } as Message;
          }

          // Get unread count
          const { data: messageIds } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', convo.id);

          const { count } = await supabase
            .from('message_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false)
            .in('message_id', messageIds?.map(m => m.id) || []);

          // Get application info if exists
          let application = null;
          if (convo.application_id) {
            const { data: app } = await supabase
              .from('applications')
              .select('company_name, position')
              .eq('id', convo.application_id)
              .maybeSingle();
            application = app;
          }

          return {
            ...convo,
            application,
            participants: participantsWithProfiles,
            last_message: lastMessageWithSender,
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
      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*, attachments:message_attachments(*)')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Fetch sender profiles for all messages
      const senderIds = [...new Set(messagesData?.map((m) => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', senderIds);

      // Combine messages with sender data
      const messagesWithSenders = (messagesData || []).map((msg) => ({
        ...msg,
        sender: profiles?.find((p) => p.id === msg.sender_id),
      }));

      setMessages(messagesWithSenders as unknown as Message[]);

      // Mark messages as read
      if (messagesData && messagesData.length > 0) {
        const messageIds = messagesData.map((m) => m.id);
        await supabase
          .from('message_notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .in('message_id', messageIds);
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId, user?.id]);

  const sendMessage = useCallback(
    async (content: string, files?: File[], metadata?: Record<string, any>) => {
      if (!conversationId || !user?.id || (!content.trim() && !files?.length && !metadata?.media_url && !metadata?.gif_url && !metadata?.sticker_url)) return;

      setSending(true);
      try {
        // Insert message
        const { data: newMessage, error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: content.trim() || '',
            message_type: 'text',
            media_type: metadata?.media_type || 'text',
            media_url: metadata?.media_url,
            media_duration: metadata?.media_duration,
            gif_url: metadata?.gif_url,
            sticker_url: metadata?.sticker_url,
            priority: metadata?.priority || 'normal',
            is_urgent: metadata?.is_urgent || false,
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

            if (uploadError) {
              console.error('Storage upload error:', uploadError);
              throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
            }

            const { error: attachmentError } = await supabase.from('message_attachments').insert({
              message_id: newMessage.id,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              file_size: file.size,
            });

            if (attachmentError) {
              console.error('Attachment record error:', attachmentError);
              throw new Error(`Failed to save attachment record: ${attachmentError.message}`);
            }
          }
        }

        toast.success('Message sent', {
          description: 'Your message has been delivered',
        });
      } catch (error: any) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message', {
          description: error.message || 'Please try again',
        });
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

          // Skip if deleted
          if (newMessage.deleted_at) return;

          // If we're in a specific conversation, reload messages to get attachments
          if (conversationId && newMessage.conversation_id === conversationId) {
            loadMessages();
          }

          // Always reload conversations to update last message
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, conversationId, loadConversations, loadMessages]);

  // Initial load
  useEffect(() => {
    if (conversationId) {
      loadMessages();
    } else {
      loadConversations();
    }
  }, [conversationId, loadMessages, loadConversations]);

  const broadcastTyping = useCallback(async () => {
    if (!conversationId) return;
    const channel = supabase.channel(`presence-${conversationId}`);
    await channel.track({ user_id: user?.id, typing: true });
    setTimeout(() => channel.track({ typing: false }), 3000);
  }, [conversationId, user]);

  return {
    conversations,
    messages,
    loading,
    sending,
    typingUsers,
    sendMessage,
    loadConversations,
    loadMessages,
    broadcastTyping,
  };
};