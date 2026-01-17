import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnreadState {
  channel_id: string;
  unread_count: number | null;
  last_read_at: string | null;
}

export const useLiveHubUnread = () => {
  const { user } = useAuth();
  const [unreadStates, setUnreadStates] = useState<Record<string, UnreadState>>({});

  useEffect(() => {
    if (!user) return;

    loadUnreadStates();
    subscribeToUnreadChanges();
  }, [user]);

  const loadUnreadStates = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('live_channel_read_states')
      .select('channel_id, unread_count, last_read_at')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error loading unread states:', error);
      return;
    }

    const statesMap = (data || []).reduce((acc, state) => {
      acc[state.channel_id] = state;
      return acc;
    }, {} as Record<string, UnreadState>);

    setUnreadStates(statesMap);
  };

  const subscribeToUnreadChanges = () => {
    if (!user) return;

    const channel = supabase
      .channel('unread_states_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_channel_read_states',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadUnreadStates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = useCallback(async (channelId: string) => {
    if (!user) return;

    const { error } = await supabase.rpc('mark_channel_as_read', {
      p_channel_id: channelId,
      p_user_id: user.id
    });

    if (error) {
      console.error('Error marking channel as read:', error);
    }
  }, [user]);

  const getUnreadCount = useCallback((channelId: string) => {
    return unreadStates[channelId]?.unread_count || 0;
  }, [unreadStates]);

  const getTotalUnreadCount = useCallback(() => {
    return Object.values(unreadStates).reduce((total, state) => total + (state.unread_count ?? 0), 0);
  }, [unreadStates]);

  return {
    unreadStates,
    getUnreadCount,
    getTotalUnreadCount,
    markAsRead
  };
};