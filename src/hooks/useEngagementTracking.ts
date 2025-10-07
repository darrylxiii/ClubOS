import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EngagementTrackingOptions {
  postId: string;
  postAuthorId: string;
  onView?: () => void;
}

export function useEngagementTracking({ 
  postId, 
  postAuthorId,
  onView 
}: EngagementTrackingOptions) {
  const { user } = useAuth();
  const startTimeRef = useRef<number>(Date.now());
  const hasTrackedView = useRef(false);

  // Track view when component mounts
  useEffect(() => {
    if (!user || !postId || hasTrackedView.current) return;

    const trackView = async () => {
      try {
        await (supabase as any)
          .from('post_engagement_signals')
          .upsert({
            user_id: user.id,
            post_id: postId,
            viewed_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,post_id',
            ignoreDuplicates: false
          });
        
        hasTrackedView.current = true;
        onView?.();
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    };

    trackView();
  }, [user, postId, onView]);

  // Track view duration on unmount
  useEffect(() => {
    return () => {
      if (!user || !postId) return;

      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      // Only track if viewed for more than 1 second
      if (duration > 1) {
        (supabase as any)
          .from('post_engagement_signals')
          .update({ view_duration_seconds: duration })
          .eq('user_id', user.id)
          .eq('post_id', postId)
          .then(() => {
            console.log(`Tracked ${duration}s view on post ${postId}`);
          })
          .catch((err: any) => console.error('Error updating view duration:', err));
      }
    };
  }, [user, postId]);

  const trackLike = useCallback(async () => {
    if (!user || !postId) return;

    try {
      await (supabase as any)
        .from('post_engagement_signals')
        .upsert({
          user_id: user.id,
          post_id: postId,
          liked: true,
          liked_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,post_id',
        });

      // Update relationship score with post author
      if (postAuthorId && postAuthorId !== user.id) {
        await (supabase as any).rpc('update_relationship_score', {
          p_user_id: user.id,
          p_related_user_id: postAuthorId,
        });
      }
    } catch (error) {
      console.error('Error tracking like:', error);
    }
  }, [user, postId, postAuthorId]);

  const trackComment = useCallback(async () => {
    if (!user || !postId) return;

    try {
      await (supabase as any)
        .from('post_engagement_signals')
        .upsert({
          user_id: user.id,
          post_id: postId,
          commented: true,
          commented_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,post_id',
        });

      // Update relationship score (comments are stronger signals)
      if (postAuthorId && postAuthorId !== user.id) {
        await (supabase as any).rpc('update_relationship_score', {
          p_user_id: user.id,
          p_related_user_id: postAuthorId,
        });
      }
    } catch (error) {
      console.error('Error tracking comment:', error);
    }
  }, [user, postId, postAuthorId]);

  const trackShare = useCallback(async () => {
    if (!user || !postId) return;

    try {
      await (supabase as any)
        .from('post_engagement_signals')
        .upsert({
          user_id: user.id,
          post_id: postId,
          shared: true,
          shared_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,post_id',
        });

      // Update relationship score (shares are strong signals)
      if (postAuthorId && postAuthorId !== user.id) {
        await (supabase as any).rpc('update_relationship_score', {
          p_user_id: user.id,
          p_related_user_id: postAuthorId,
        });
      }
    } catch (error) {
      console.error('Error tracking share:', error);
    }
  }, [user, postId, postAuthorId]);

  const trackSave = useCallback(async (saved: boolean) => {
    if (!user || !postId) return;

    try {
      await (supabase as any)
        .from('post_engagement_signals')
        .upsert({
          user_id: user.id,
          post_id: postId,
          saved,
          saved_at: saved ? new Date().toISOString() : null,
        }, {
          onConflict: 'user_id,post_id',
        });

      if (saved && postAuthorId && postAuthorId !== user.id) {
        await (supabase as any).rpc('update_relationship_score', {
          p_user_id: user.id,
          p_related_user_id: postAuthorId,
        });
      }
    } catch (error) {
      console.error('Error tracking save:', error);
    }
  }, [user, postId, postAuthorId]);

  return {
    trackLike,
    trackComment,
    trackShare,
    trackSave,
  };
}