import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useJobFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch user's favorites
  useEffect(() => {
    if (!user?.id) {
      setFavorites(new Set());
      setLoading(false);
      return;
    }

    const fetchFavorites = async () => {
      try {
        const { data, error } = await supabase
          .from('job_favorites')
          .select('job_id')
          .eq('user_id', user.id);

        if (error) throw error;
        setFavorites(new Set(data?.map(f => f.job_id) || []));
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('job_favorites_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_favorites',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFavorites(prev => new Set([...prev, (payload.new as any).job_id]));
          } else if (payload.eventType === 'DELETE') {
            setFavorites(prev => {
              const next = new Set(prev);
              next.delete((payload.old as any).job_id);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const toggleFavorite = useCallback(async (jobId: string) => {
    if (!user?.id) {
      toast.error('Please sign in to save favorites');
      return;
    }

    const isFavorited = favorites.has(jobId);

    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      if (isFavorited) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });

    try {
      if (isFavorited) {
        const { error } = await supabase
          .from('job_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('job_id', jobId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('job_favorites')
          .insert({ user_id: user.id, job_id: jobId });

        if (error) throw error;
        toast.success('Added to favorites');
      }
    } catch (error) {
      // Revert on error
      setFavorites(prev => {
        const next = new Set(prev);
        if (isFavorited) {
          next.add(jobId);
        } else {
          next.delete(jobId);
        }
        return next;
      });
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  }, [user?.id, favorites]);

  const isFavorite = useCallback((jobId: string) => favorites.has(jobId), [favorites]);

  return {
    favorites,
    favoritesCount: favorites.size,
    loading,
    toggleFavorite,
    isFavorite,
  };
}
