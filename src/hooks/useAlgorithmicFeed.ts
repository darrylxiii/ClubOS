import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Post {
  id: string;
  user_id: string;
  company_id: string | null;
  content: string;
  media_urls: any;
  created_at: string;
  updated_at: string;
  poll_question: string | null;
  poll_options: any;
  ai_summary: string | null;
  is_public: boolean;
  profiles?: any;
  companies?: any;
  post_likes?: any[];
  post_comments?: any[];
  algorithmScore?: number;
}

export function useAlgorithmicFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState<'algorithmic' | 'trending' | 'following'>('algorithmic');

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Limit for performance

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs and company IDs
      const userIds = [...new Set(postsData.map(p => p.user_id).filter(Boolean))];
      const companyIds = [...new Set(postsData.map(p => p.company_id).filter(Boolean))];

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, current_title')
        .in('id', userIds);

      // Fetch companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name, logo_url')
        .in('id', companyIds);

      // Fetch likes
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postsData.map(p => p.id));

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select('id, post_id')
        .in('post_id', postsData.map(p => p.id));

      // Create lookup maps
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const companiesMap = new Map(companiesData?.map(c => [c.id, c]) || []);
      const likesMap = new Map<string, any[]>();
      const commentsMap = new Map<string, any[]>();

      likesData?.forEach(like => {
        const existing = likesMap.get(like.post_id) || [];
        likesMap.set(like.post_id, [...existing, like]);
      });

      commentsData?.forEach(comment => {
        const existing = commentsMap.get(comment.post_id) || [];
        commentsMap.set(comment.post_id, [...existing, comment]);
      });

      // Calculate scores for each post (if user is logged in)
      let enrichedPosts = postsData.map(post => ({
        ...post,
        profiles: post.user_id ? profilesMap.get(post.user_id) : null,
        companies: post.company_id ? companiesMap.get(post.company_id) : null,
        post_likes: likesMap.get(post.id) || [],
        post_comments: commentsMap.get(post.id) || [],
        algorithmScore: 0,
      }));

      // Calculate algorithmic scores if user is logged in
      if (user && feedType === 'algorithmic') {
        const scoresPromises = enrichedPosts.map(async (post) => {
          try {
            const { data: scoreData } = await (supabase as any).rpc('calculate_post_score', {
              p_user_id: user.id,
              p_post_id: post.id,
              p_post_created_at: post.created_at,
              p_post_author_id: post.user_id,
              p_likes_count: post.post_likes.length,
              p_comments_count: post.post_comments.length,
              p_shares_count: 0, // TODO: Get from post_shares table
            });
            return { ...post, algorithmScore: Number(scoreData) || 0 };
          } catch (error) {
            console.error('Error calculating score:', error);
            return { ...post, algorithmScore: 0 };
          }
        });

        enrichedPosts = await Promise.all(scoresPromises);
        
        // Sort by algorithm score
        enrichedPosts.sort((a, b) => (b.algorithmScore || 0) - (a.algorithmScore || 0));
      } else if (feedType === 'trending') {
        // Sort by engagement (viral content)
        enrichedPosts.sort((a, b) => {
          const aEngagement = a.post_likes.length * 1 + a.post_comments.length * 3;
          const bEngagement = b.post_likes.length * 1 + b.post_comments.length * 3;
          return bEngagement - aEngagement;
        });
      } else if (feedType === 'following') {
        // TODO: Filter by followed users
        // For now, just show all posts in chronological order
        enrichedPosts.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }

      setPosts(enrichedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, [user, feedType]);

  useEffect(() => {
    fetchPosts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  return {
    posts,
    loading,
    feedType,
    setFeedType,
    refetch: fetchPosts,
  };
}