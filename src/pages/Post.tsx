import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PostCard } from "@/components/feed/PostCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/AppLayout";
import { notify } from "@/lib/notify";

export default function Post() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      
      // Fetch the post
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (postError || !postData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Check if post is public when user is not logged in
      if (!user && !postData.is_public) {
        setNotFound(true);
        setLoading(false);
        notify.error("Private post", {
          description: "This post is only visible to logged in users.",
        });
        return;
      }

      // Fetch author profile
      let authorData = null;
      if (postData.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, current_title')
          .eq('id', postData.user_id)
          .single();
        authorData = profileData;
      } else if (postData.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id, name, logo_url')
          .eq('id', postData.company_id)
          .single();
        authorData = companyData;
      }

      // Fetch likes
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id, user_id')
        .eq('post_id', postData.id);

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select('id, post_id')
        .eq('post_id', postData.id);

      setPost({
        ...postData,
        profiles: postData.user_id ? authorData : null,
        companies: postData.company_id ? authorData : null,
        post_likes: likesData || [],
        post_comments: commentsData || []
      });
    } catch (error) {
      console.error('Error fetching post:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto py-8 px-4">
          <Skeleton className="h-12 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (notFound || !post) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto py-8 px-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/feed')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Feed
          </Button>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Post not found</h2>
            <p className="text-muted-foreground mb-4">
              This post may have been deleted or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate('/feed')}>
              Go to Feed
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/feed')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Feed
          </Button>
          {!user && (
            <Button
              variant="default"
              onClick={() => navigate('/auth')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Join The Quantum Club
            </Button>
          )}
        </div>
        
        <PostCard post={post} onUpdate={fetchPost} />
      </div>
    </AppLayout>
  );
}