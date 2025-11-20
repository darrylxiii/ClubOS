import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useConversationActions = () => {
  const [loading, setLoading] = useState(false);

  const togglePin = useCallback(async (conversationId: string, currentValue: boolean) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('conversations')
        .update({ is_pinned: !currentValue })
        .eq('id', conversationId);

      if (error) throw error;
      toast.success(currentValue ? 'Conversation unpinned' : 'Conversation pinned');
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update conversation');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleArchive = useCallback(async (conversationId: string, currentValue: boolean) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('conversations')
        .update({ is_archived: !currentValue })
        .eq('id', conversationId);

      if (error) throw error;
      toast.success(currentValue ? 'Conversation unarchived' : 'Conversation archived');
    } catch (error) {
      console.error('Error toggling archive:', error);
      toast.error('Failed to update conversation');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleMute = useCallback(async (conversationId: string, userId: string, currentValue: boolean) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('conversation_participants')
        .update({ 
          is_muted: !currentValue,
          muted_until: currentValue ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success(currentValue ? 'Notifications enabled' : 'Muted for 7 days');
    } catch (error) {
      console.error('Error toggling mute:', error);
      toast.error('Failed to update notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllAsRead = useCallback(async (conversationId: string, userId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null);

      if (error) throw error;
      toast.success('All messages marked as read');
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Failed to mark messages as read');
    } finally {
      setLoading(false);
    }
  }, []);

  const leaveConversation = useCallback(async (conversationId: string, userId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('You left the conversation');
    } catch (error) {
      console.error('Error leaving conversation:', error);
      toast.error('Failed to leave conversation');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    togglePin,
    toggleArchive,
    toggleMute,
    markAllAsRead,
    leaveConversation,
    deleteConversation,
  };
};
