import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageAttachment } from './useMessages';

export interface MediaItem {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  message_id: string;
  created_at: string;
  sender_name: string;
}

export interface LinkItem {
  id: string;
  url: string;
  title?: string;
  message_id: string;
  created_at: string;
  sender_name: string;
}

export const useConversationMedia = (conversationId?: string) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      setMedia([]);
      setLinks([]);
      setLoading(false);
      return;
    }

    loadMedia();
  }, [conversationId]);

  const loadMedia = async () => {
    if (!conversationId) return;

    try {
      setLoading(true);

      // Load attachments
      const { data: attachments, error: attachError } = await supabase
        .from('message_attachments')
        .select(`
          *,
          messages!inner (
            conversation_id,
            sender:profiles!messages_sender_id_fkey (
              full_name
            )
          )
        `)
        .eq('messages.conversation_id', conversationId)
        .order('created_at', { ascending: false });

      if (attachError) throw attachError;

      const mediaItems: MediaItem[] = (attachments || []).map((att: any) => ({
        id: att.id,
        file_name: att.file_name,
        file_type: att.file_type,
        file_size: att.file_size,
        file_path: att.file_path,
        message_id: att.message_id,
        created_at: att.created_at,
        sender_name: att.messages?.sender?.full_name || 'Unknown'
      }));

      setMedia(mediaItems);

      // Load links from message content
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender:profiles!messages_sender_id_fkey (
            full_name
          )
        `)
        .eq('conversation_id', conversationId)
        .not('content', 'is', null)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      // Extract URLs from messages
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const linkItems: LinkItem[] = [];

      messages?.forEach((msg: any) => {
        const urls = msg.content?.match(urlRegex);
        if (urls) {
          urls.forEach((url: string) => {
            linkItems.push({
              id: `${msg.id}-${url}`,
              url,
              title: url,
              message_id: msg.id,
              created_at: msg.created_at,
              sender_name: msg.sender?.full_name || 'Unknown'
            });
          });
        }
      });

      setLinks(linkItems);
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  return { media, links, loading, reload: loadMedia };
};
