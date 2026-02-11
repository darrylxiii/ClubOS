import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'system' | 'ai_generated' | 'escalation';
  system_message_type?: string;
  meeting_id?: string | null;
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
  is_archived?: boolean;
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

  // Pagination state
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestMessageDate, setOldestMessageDate] = useState<string | null>(null);
  const MESSAGES_PER_PAGE = 50;

  // Store user's conversation IDs for O(1) lookups (fixes N+1 query)
  const [userConversationIds, setUserConversationIds] = useState<Set<string>>(new Set());

  // Load conversations for inbox
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get user's conversations through participants
      const { data: userParticipations, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantsError) {
        console.error('Error loading userParticipations:', {
          message: participantsError.message,
          code: participantsError.code,
          details: participantsError,
        });
        throw participantsError;
      }

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

      if (convosError) {
        console.error('Error loading conversations:', {
          message: convosError.message,
          code: convosError.code,
          details: convosError,
        });
        throw convosError;
      }

      // Get last message, participants, and unread count for each conversation
      // Optimized: Batch queries to eliminate N+1
      const convoIds = convos?.map(c => c.id) || [];

      // Batch fetch all participants
      const { data: allParticipants } = await supabase
        .from('conversation_participants')
        .select('*')
        .in('conversation_id', convoIds);

      // Batch fetch profiles for all participants
      const participantUserIds = [...new Set(allParticipants?.map(p => p.user_id) || [])];
      const { data: participantProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', participantUserIds);

      const profilesById = participantProfiles?.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>) || {};

      // Batch fetch all last messages
      const { data: allLastMessages } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', convoIds)
        .order('created_at', { ascending: false });

      // Batch fetch sender profiles for messages
      const senderIds = [...new Set(allLastMessages?.map(m => m.sender_id) || [])];
      const { data: senderProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', senderIds);

      const sendersById = senderProfiles?.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>) || {};

      // Batch fetch all unread counts
      const { data: allUnreadNotifications } = await supabase
        .from('message_notifications')
        .select('message_id, messages!inner(conversation_id)')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .in('messages.conversation_id', convoIds);

      // Batch fetch applications if needed
      const appIds = convos?.filter(c => c.application_id).map(c => c.application_id!) || [];
      const { data: allApplications } = appIds.length > 0 ? await supabase
        .from('applications')
        .select('id, company_name, position')
        .in('id', appIds) : { data: [] };

      // Group data by conversation
      const participantsByConvo = allParticipants?.reduce((acc, p) => {
        if (!acc[p.conversation_id]) acc[p.conversation_id] = [];
        const profile = profilesById[p.user_id];
        acc[p.conversation_id].push({
          id: p.id,
          conversation_id: p.conversation_id,
          user_id: p.user_id,
          role: p.role,
          joined_at: p.joined_at,
          last_read_at: p.last_read_at,
          notifications_enabled: p.notifications_enabled,
          is_muted: p.is_muted,
          profile: profile ? {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url
          } : null
        });
        return acc;
      }, {} as Record<string, any[]>) || {};

      const lastMessageByConvo = allLastMessages?.reduce((acc, msg) => {
        if (!acc[msg.conversation_id]) {
          const sender = sendersById[msg.sender_id];
          acc[msg.conversation_id] = {
            ...msg,
            sender: sender || undefined
          };
        }
        return acc;
      }, {} as Record<string, any>) || {};

      const unreadCountByConvo = allUnreadNotifications?.reduce((acc, notif) => {
        const convoId = (notif as any).messages?.conversation_id;
        if (convoId) acc[convoId] = (acc[convoId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      type AppData = { id: string; company_name: string; position: string };
      const applicationById: Record<string, AppData> = {};
      allApplications?.forEach(app => {
        if (app && app.id) {
          applicationById[app.id] = app as AppData;
        }
      });

      const conversationsWithDetails = convos?.map(convo => ({
        ...convo,
        application: convo.application_id ? (applicationById[convo.application_id] || null) : null,
        participants: participantsByConvo[convo.id] || [],
        last_message: lastMessageByConvo[convo.id] || null,
        unread_count: unreadCountByConvo[convo.id] || 0,
        metadata: {
          ...(typeof convo.metadata === 'object' && convo.metadata !== null ? convo.metadata : {}),
          is_group: (participantsByConvo[convo.id]?.length || 0) > 2,
          participant_count: participantsByConvo[convo.id]?.length || 0
        }
      })) || [];

      setConversations(conversationsWithDetails as unknown as Conversation[]);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error loading conversations:', { message: msg, error });
      toast.error('Failed to load conversations', {
        description: msg || 'Please try refreshing the page',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load messages for a specific conversation with pagination
  const loadMessages = useCallback(async (loadMore = false) => {
    if (!conversationId || !user?.id) return;

    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      let query = supabase
        .from('messages')
        .select('*, attachments:message_attachments(*)')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      // For pagination, load messages older than the oldest we have
      if (loadMore && oldestMessageDate) {
        query = query.lt('created_at', oldestMessageDate);
      }

      const { data: messagesData, error: messagesError } = await query;

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

      // Update pagination state
      const hasMore = messagesData && messagesData.length === MESSAGES_PER_PAGE;
      setHasMoreMessages(hasMore);

      if (messagesData && messagesData.length > 0) {
        // Reverse to get chronological order (oldest first)
        const reversedMessages = [...messagesWithSenders].reverse() as Message[];

        if (loadMore) {
          // Prepend older messages
          setMessages((prev) => [...reversedMessages, ...prev]);
        } else {
          // Initial load or refresh
          setMessages(reversedMessages);
        }

        // Track oldest message date for pagination
        const oldest = messagesData[messagesData.length - 1];
        setOldestMessageDate(oldest.created_at);
      } else {
        if (!loadMore) {
          setMessages([]);
        }
      }

      // Mark messages as read
      if (messagesData && messagesData.length > 0) {
        const messageIds = messagesData.map((m) => m.id);
        await supabase
          .from('message_notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .in('message_id', messageIds);
      }
    } catch (error: unknown) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      if (loadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [conversationId, user?.id, oldestMessageDate]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(() => {
    if (!loadingMore && hasMoreMessages) {
      loadMessages(true);
    }
  }, [loadingMore, hasMoreMessages, loadMessages]);

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
      } catch (error: unknown) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message', {
          description: error instanceof Error ? error.message : 'Please try again',
        });
      } finally {
        setSending(false);
      }
    },
    [conversationId, user?.id]
  );

  // Load user conversations once and keep in memory (fixes N+1 query)
  useEffect(() => {
    if (!user?.id) return;

    const loadUserConversations = async () => {
      const { data } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (data) {
        setUserConversationIds(new Set(data.map(c => c.conversation_id)));
      }
    };

    loadUserConversations();

    // Subscribe to changes in user's conversations
    const participantsChannel = supabase
      .channel('user-conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${user.id}`
      }, () => {
        loadUserConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
    };
  }, [user?.id]);

  // Subscribe to real-time updates - Optimized with in-memory conversation IDs
  useEffect(() => {
    if (!user?.id) return;

    // Single multiplexed channel for better performance
    const channel = supabase
      .channel('messages-multiplexed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          if (newMessage.deleted_at) return;

          // Use in-memory set for O(1) lookup (no more N+1 query!)
          if (userConversationIds.has(newMessage.conversation_id)) {
            if (conversationId && newMessage.conversation_id === conversationId) {
              loadMessages(false);
            }

            // Optimistically update conversations list
            setConversations(prev => {
              const convoIndex = prev.findIndex(c => c.id === newMessage.conversation_id);
              if (convoIndex === -1) return prev; // Should not happen if in userConversationIds

              const updatedConvo = { ...prev[convoIndex] };
              updatedConvo.last_message = newMessage;
              updatedConvo.last_message_at = newMessage.created_at;

              // Increment unread count if not current conversation
              if (newMessage.conversation_id !== conversationId && newMessage.sender_id !== user.id) {
                updatedConvo.unread_count = (updatedConvo.unread_count || 0) + 1;
              }

              // Move to top
              const newConversations = [...prev];
              newConversations.splice(convoIndex, 1);
              newConversations.unshift(updatedConvo);
              return newConversations;
            });
          } else {
            // New conversation for this user, reload all to be safe
            loadConversations();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
        },
        async (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updatedMessage.id
                ? { ...msg, ...updatedMessage, sender: msg.sender }
                : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, conversationId, userConversationIds, loadConversations, loadMessages]);

  // Initial load
  useEffect(() => {
    if (conversationId) {
      // Reset pagination state when conversation changes
      setOldestMessageDate(null);
      setHasMoreMessages(true);
      loadMessages(false);
    } else {
      loadConversations();
    }
  }, [conversationId, loadConversations]);

  // Ref to store the typing channel to prevent memory leaks
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Cleanup typing channel on unmount or conversation change
  useEffect(() => {
    return () => {
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
    };
  }, [conversationId]);

  const broadcastTyping = useCallback(async () => {
    if (!conversationId || !user?.id) return;

    // Reuse existing channel or create new one
    if (!typingChannelRef.current) {
      typingChannelRef.current = supabase.channel(`presence-${conversationId}`);
      await typingChannelRef.current.subscribe();
    }

    await typingChannelRef.current.track({ user_id: user.id, typing: true });
    setTimeout(async () => {
      if (typingChannelRef.current) {
        await typingChannelRef.current.track({ user_id: user.id, typing: false });
      }
    }, 3000);
  }, [conversationId, user?.id]);

  return {
    conversations,
    messages,
    loading,
    sending,
    typingUsers,
    sendMessage,
    loadConversations,
    loadMessages,
    loadMoreMessages,
    hasMoreMessages,
    loadingMore,
    broadcastTyping,
  };
};