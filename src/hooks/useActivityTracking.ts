import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getSessionId, trackEvent } from '@/services/sessionTracking';

/**
 * Hook to automatically track user activity.
 * Deferred: All RPCs and event listeners start after a 2-second delay
 * to avoid blocking first paint.
 */
export const useActivityTracking = () => {
  const { user } = useAuth();
  const deferredRef = useRef(false);

  const trackActivity = useCallback(async (actionType?: string) => {
    if (!user?.id) return;

    try {
      const sessionId = getSessionId();

      await (supabase as any).rpc('update_user_activity_tracking', {
        p_user_id: user.id,
        p_action_type: actionType || null,
        p_increment_actions: true,
        p_session_id: sessionId,
        p_is_login: false,
        p_is_logout: false,
        p_session_duration_minutes: null,
      });
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  }, [user?.id]);

  const updateOnlineStatus = useCallback(async (status: 'online' | 'away' | 'busy' | 'offline') => {
    if (!user?.id) return;

    try {
      await supabase.rpc('update_user_online_status', {
        p_user_id: user.id,
        p_status: status,
      });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // Defer all tracking RPCs and listeners by 2 seconds
    const deferTimer = setTimeout(() => {
      deferredRef.current = true;

      updateOnlineStatus('online');
      trackEvent(user.id, 'page_view', {
        eventCategory: 'navigation',
        pagePath: window.location.pathname,
      });
      trackActivity('page_view');
    }, 2000);

    // Heartbeat starts after defer
    let activityInterval: ReturnType<typeof setInterval> | null = null;
    const heartbeatTimer = setTimeout(() => {
      activityInterval = setInterval(() => {
        trackActivity('heartbeat');
      }, 60 * 1000);
    }, 2000);

    const handleVisibilityChange = () => {
      if (!deferredRef.current) return;
      if (document.hidden) {
        updateOnlineStatus('away');
      } else {
        updateOnlineStatus('online');
        trackActivity('page_focus');
      }
    };

    const handleBeforeUnload = () => {
      updateOnlineStatus('offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(deferTimer);
      clearTimeout(heartbeatTimer);
      if (activityInterval) clearInterval(activityInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (deferredRef.current) {
        updateOnlineStatus('offline');
      }
    };
  }, [user?.id, trackActivity, updateOnlineStatus]);

  return {
    trackActivity,
    updateOnlineStatus,
  };
};
