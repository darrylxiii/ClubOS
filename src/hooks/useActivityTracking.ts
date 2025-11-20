import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getSessionId, trackEvent } from '@/services/sessionTracking';

/**
 * Hook to automatically track user activity
 * Tracks page views, interactions, and maintains online status
 */
export const useActivityTracking = () => {
  const { user } = useAuth();

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

    // Set user as online when component mounts
    updateOnlineStatus('online');

    // Track page view with detailed event
    trackEvent(user.id, 'page_view', {
      eventCategory: 'navigation',
      pagePath: window.location.pathname,
    });
    trackActivity('page_view');

    // Update activity periodically (every 60 seconds for enterprise-level accuracy)
    const activityInterval = setInterval(() => {
      trackActivity('heartbeat');
    }, 60 * 1000);

    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateOnlineStatus('away');
      } else {
        updateOnlineStatus('online');
        trackActivity('page_focus');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set user as offline on page unload
    const handleBeforeUnload = () => {
      updateOnlineStatus('offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(activityInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateOnlineStatus('offline');
    };
  }, [user?.id, trackActivity, updateOnlineStatus]);

  return {
    trackActivity,
    updateOnlineStatus,
  };
};
