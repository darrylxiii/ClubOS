import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to track profile views when a user views another user's profile
 * Logs to profile_views table for analytics and "Who Viewed My Profile" feature
 */
export const useProfileViewTracking = (viewedUserId: string | null) => {
  const { user } = useAuth();

  const logProfileView = useCallback(async () => {
    // Don't log if:
    // - No viewed user ID
    // - Viewer is viewing their own profile
    // - No authenticated user (for anonymous views, viewer_user_id will be null)
    if (!viewedUserId) return;
    if (user?.id === viewedUserId) return;

    try {
      // Check if this viewer has viewed this profile in the last hour
      // to prevent excessive logging
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: recentView } = await supabase
        .from('profile_views')
        .select('id')
        .eq('viewed_user_id', viewedUserId)
        .eq('viewer_user_id', user?.id || null)
        .gte('viewed_at', oneHourAgo)
        .limit(1)
        .maybeSingle();

      // If already viewed within the hour, skip logging
      if (recentView) return;

      // Log the profile view
      const { error } = await supabase
        .from('profile_views')
        .insert({
          viewed_user_id: viewedUserId,
          viewer_user_id: user?.id || null,
          viewer_company_id: null, // Could be populated if viewing as company
          is_anonymous: !user,
          viewed_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[ProfileViewTracking] Error logging view:', error);
      }
    } catch (error) {
      console.error('[ProfileViewTracking] Failed to log profile view:', error);
    }
  }, [viewedUserId, user?.id]);

  useEffect(() => {
    logProfileView();
  }, [logProfileView]);

  return { logProfileView };
};

/**
 * Hook to fetch profile view stats for the current user
 */
export const useProfileViewStats = () => {
  const { user } = useAuth();

  const fetchViewStats = useCallback(async () => {
    if (!user) return { totalViews: 0, recentViews: 0, uniqueViewers: 0 };

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [totalRes, recentRes, uniqueRes] = await Promise.all([
        supabase
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('viewed_user_id', user.id)
          .gte('viewed_at', thirtyDaysAgo),
        supabase
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('viewed_user_id', user.id)
          .gte('viewed_at', sevenDaysAgo),
        supabase
          .from('profile_views')
          .select('viewer_user_id')
          .eq('viewed_user_id', user.id)
          .not('viewer_user_id', 'is', null)
          .gte('viewed_at', thirtyDaysAgo),
      ]);

      // Count unique viewers
      const uniqueViewerIds = new Set(uniqueRes.data?.map(v => v.viewer_user_id));

      return {
        totalViews: totalRes.count || 0,
        recentViews: recentRes.count || 0,
        uniqueViewers: uniqueViewerIds.size,
      };
    } catch (error) {
      console.error('[ProfileViewStats] Error fetching stats:', error);
      return { totalViews: 0, recentViews: 0, uniqueViewers: 0 };
    }
  }, [user]);

  return { fetchViewStats };
};
