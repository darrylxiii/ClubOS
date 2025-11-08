import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getUnreadMentionCount, markMentionAsRead } from '@/services/teamMembersService';

export const useNoteMentions = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    loadUnreadCount();

    // Subscribe to real-time mention changes
    const channel = supabase
      .channel('note-mentions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'note_mentions',
          filter: `mentioned_user_id=eq.${user.id}`
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user) return;

    try {
      const count = await getUnreadMentionCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread mention count:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (mentionId: string) => {
    const success = await markMentionAsRead(mentionId);
    if (success) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    return success;
  };

  return {
    unreadCount,
    loading,
    markAsRead,
    refresh: loadUnreadCount
  };
};
