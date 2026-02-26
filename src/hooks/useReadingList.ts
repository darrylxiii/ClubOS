import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getPostBySlug, BlogPost } from '@/data/blog';
import { getAnonymousId } from '@/lib/anonymous-id';
import { toast } from 'sonner';

interface BookmarkWithPost {
  id: string;
  post_slug: string;
  created_at: string;
  post?: BlogPost;
}

export const useReadingList = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkWithPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchBookmarks = useCallback(async () => {
    setIsLoading(true);
    const anonymousId = getAnonymousId();

    try {
      let query = supabase
        .from('blog_bookmarks')
        .select('id, post_slug, created_at')
        .order('created_at', { ascending: false });

      if (user) {
        query = query.eq('user_id', user.id);
      } else {
        query = query.eq('anonymous_id', anonymousId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enrich with post data
      const enrichedBookmarks: BookmarkWithPost[] = (data || []).map((bookmark) => ({
        ...bookmark,
        post: getPostBySlug(bookmark.post_slug),
      }));

      setBookmarks(enrichedBookmarks);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const removeBookmark = async (postSlug: string) => {
    const anonymousId = getAnonymousId();

    try {
      const query = supabase
        .from('blog_bookmarks')
        .delete()
        .eq('post_slug', postSlug);

      if (user) {
        await query.eq('user_id', user.id);
      } else {
        await query.eq('anonymous_id', anonymousId);
      }

      setBookmarks((prev) => prev.filter((b) => b.post_slug !== postSlug));
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  const isBookmarked = (postSlug: string) => {
    return bookmarks.some((b) => b.post_slug === postSlug);
  };

  return {
    bookmarks,
    isLoading,
    removeBookmark,
    isBookmarked,
    refetch: fetchBookmarks,
  };
};
