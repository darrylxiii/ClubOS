import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CursorPosition {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  color: string;
  x: number;
  y: number;
  blockId: string | null;
  isTyping: boolean;
  lastSeen: number;
}

interface CursorState {
  [userId: string]: CursorPosition;
}

interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
}

const CURSOR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#6366f1'
];

const getUserColor = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
};

export function useCollaborativeCursors(pageId: string | undefined) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [cursors, setCursors] = useState<CursorState>({});
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const throttleRef = useRef<number>(0);

  // Fetch user profile
  useEffect(() => {
    if (!user) return;
    
    supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [user]);

  // Broadcast cursor position
  const updateCursorPosition = useCallback((x: number, y: number, blockId: string | null = null) => {
    if (!channelRef.current || !user || !pageId) return;
    
    // Throttle updates to 30fps
    const now = Date.now();
    if (now - throttleRef.current < 33) return;
    throttleRef.current = now;

    channelRef.current.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: {
        userId: user.id,
        userName: profile?.full_name || 'Anonymous',
        avatarUrl: profile?.avatar_url,
        color: getUserColor(user.id),
        x,
        y,
        blockId,
        isTyping: false,
        lastSeen: now
      }
    });
  }, [user, profile, pageId]);

  // Broadcast typing status
  const setTypingStatus = useCallback((isTyping: boolean, blockId: string | null = null) => {
    if (!channelRef.current || !user || !pageId) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing_status',
      payload: {
        userId: user.id,
        userName: profile?.full_name || 'Anonymous',
        avatarUrl: profile?.avatar_url,
        color: getUserColor(user.id),
        isTyping,
        blockId,
        lastSeen: Date.now()
      }
    });
  }, [user, profile, pageId]);

  // Broadcast block selection
  const selectBlock = useCallback((blockId: string | null) => {
    if (!channelRef.current || !user || !pageId) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'block_select',
      payload: {
        userId: user.id,
        userName: profile?.full_name || 'Anonymous',
        avatarUrl: profile?.avatar_url,
        color: getUserColor(user.id),
        blockId,
        lastSeen: Date.now()
      }
    });
  }, [user, profile, pageId]);

  useEffect(() => {
    if (!pageId || !user) return;

    const channel = supabase.channel(`page-cursors-${pageId}`, {
      config: {
        presence: {
          key: user.id
        }
      }
    });

    channel
      .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        if (payload.userId === user.id) return;
        setCursors(prev => ({
          ...prev,
          [payload.userId]: payload as CursorPosition
        }));
      })
      .on('broadcast', { event: 'typing_status' }, ({ payload }) => {
        if (payload.userId === user.id) return;
        setCursors(prev => ({
          ...prev,
          [payload.userId]: {
            ...prev[payload.userId],
            ...payload
          }
        }));
      })
      .on('broadcast', { event: 'block_select' }, ({ payload }) => {
        if (payload.userId === user.id) return;
        setCursors(prev => ({
          ...prev,
          [payload.userId]: {
            ...prev[payload.userId],
            ...payload
          }
        }));
      })
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setCursors(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            user_name: profile?.full_name || 'Anonymous',
            avatar_url: profile?.avatar_url,
            online_at: new Date().toISOString()
          });
        }
      });

    channelRef.current = channel;

    // Cleanup stale cursors every 5 seconds
    const cleanupInterval = setInterval(() => {
      const staleThreshold = Date.now() - 10000; // 10 seconds
      setCursors(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (next[key].lastSeen < staleThreshold) {
            delete next[key];
          }
        });
        return next;
      });
    }, 5000);

    return () => {
      clearInterval(cleanupInterval);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [pageId, user, profile]);

  return {
    cursors: Object.values(cursors),
    isConnected,
    updateCursorPosition,
    setTypingStatus,
    selectBlock
  };
}
