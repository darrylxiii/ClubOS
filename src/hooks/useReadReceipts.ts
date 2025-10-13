import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useReadReceipts = (conversationId: string | null, messages: any[]) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!conversationId || !user || messages.length === 0) return;

    // Mark unread messages as read
    const markMessagesAsRead = async () => {
      const unreadMessages = messages.filter(
        (msg) => msg.sender_id !== user.id && !msg.read_at
      );

      if (unreadMessages.length === 0) return;

      console.log('Marking messages as read:', unreadMessages.length);

      // Update read_at for direct messages (one-on-one)
      for (const message of unreadMessages) {
        try {
          const { error: updateError } = await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', message.id);

          if (updateError) {
            console.error('Error updating message read status:', updateError);
          }

          // Also create a read receipt record
          const { error: receiptError } = await supabase
            .from('message_read_receipts')
            .insert({
              message_id: message.id,
              user_id: user.id,
            })
            .select()
            .single();

          if (receiptError && !receiptError.message?.includes('duplicate')) {
            console.error('Error creating read receipt:', receiptError);
          }
        } catch (err) {
          console.error('Error marking message as read:', err);
        }
      }
    };

    // Debounce the marking to avoid too many requests
    const timeoutId = setTimeout(() => {
      markMessagesAsRead();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [conversationId, user, messages]);

  // Subscribe to read receipt updates
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`read-receipts-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_read_receipts',
        },
        (payload) => {
          console.log('Read receipt update:', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('Message read status updated:', payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);
};
