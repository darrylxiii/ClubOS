import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TypingUser {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const useLiveHubTyping = (channelId: string) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<ReturnType<typeof supabase.channel>>();

  useEffect(() => {
    if (!channelId || !user) return;

    // Create a presence channel for typing indicators
    const channel = supabase.channel(`typing:${channelId}`);
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ user_id: string; full_name: string; avatar_url: string | null }>();
        
        // Convert presence state to array of typing users (excluding current user)
        const typingUsersList = Object.values(state)
          .flat()
          .filter(presence => presence.user_id !== user.id)
          .map(presence => ({
            user_id: presence.user_id,
            full_name: presence.full_name,
            avatar_url: presence.avatar_url
          }));

        setTypingUsers(typingUsersList);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [channelId, user]);

  const startTyping = useCallback(async () => {
    if (!channelRef.current || !user) return;

    // Get user profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    // Track typing presence
    await channelRef.current.track({
      user_id: user.id,
      full_name: profile?.full_name || 'Unknown User',
      avatar_url: profile?.avatar_url || null
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [user]);

  const stopTyping = useCallback(async () => {
    if (!channelRef.current) return;
    
    await channelRef.current.untrack();
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, []);

  return {
    typingUsers,
    startTyping,
    stopTyping
  };
};