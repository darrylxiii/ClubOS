import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreatePost } from "@/components/feed/CreatePost";
import { PostCard } from "@/components/feed/PostCard";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/AppLayout";

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
    
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
  }, []);

  const fetchPosts = async () => {
    try {
      // Fetch posts with all needed data
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
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

      // Combine data
      const enrichedPosts = postsData.map(post => ({
        ...post,
        profiles: post.user_id ? profilesMap.get(post.user_id) : null,
        companies: post.company_id ? companiesMap.get(post.company_id) : null,
        post_likes: likesMap.get(post.id) || [],
        post_comments: commentsMap.get(post.id) || []
      }));

      setPosts(enrichedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-8 px-4">
        {user && <CreatePost onPostCreated={fetchPosts} />}
        
        <div className="mt-4 space-y-4">
          {loading ? (
            <>
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No posts yet. Be the first to share something!
            </div>
          ) : (
            posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post}
                onUpdate={fetchPosts}
              />
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}