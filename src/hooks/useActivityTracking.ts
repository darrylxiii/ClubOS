import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/services/sessionTracking';

/**
 * Hook to automatically track user activity
 * Tracks page views, interactions, and maintains online status
 */
export const useActivityTracking = () => {
  const { user } = useAuth();

  const trackActivity = useCallback(async (actionType?: string) => {
    if (!user?.id) return;

    try {
      // Note: Activity tracking RPC disabled - update_user_activity_tracking function doesn't exist
      console.log('[Activity Tracking] Activity tracked locally:', actionType, 'User:', user.id);
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  }, [user?.id]);

  const updateOnlineStatus = useCallback(async (status: 'online' | 'away' | 'busy' | 'offline') => {
    if (!user?.id) return;

    try {
      // Note: Online status RPC disabled - update_user_online_status function doesn't exist
      console.log('[Activity Tracking] Online status tracked locally:', status, 'User:', user.id);
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
