import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Eye, Calendar } from "lucide-react";
import { CreatePostDialog } from "./CreatePostDialog";
import { format } from "date-fns";

interface CompanyWallProps {
  companyId: string;
  canCreate?: boolean;
}

export const CompanyWall = ({ companyId, canCreate = false }: CompanyWallProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [companyId]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('company_posts')
        .select(`
          *,
          profiles:author_id (
            full_name,
            avatar_url
          )
        `)
        .eq('company_id', companyId)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error("Failed to load company posts");
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = () => {
    setShowCreateDialog(false);
    fetchPosts();
  };

  const getPostTypeColor = (type: string) => {
    const colors = {
      news: 'bg-blue-500',
      milestone: 'bg-green-500',
      event: 'bg-purple-500',
      update: 'bg-orange-500',
      media: 'bg-pink-500',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-64 bg-muted rounded"></div>
    </div>;
  }

  return (
    <>
      <Card className="border-2 border-foreground">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-black uppercase">Company Wall</CardTitle>
              <CardDescription>Latest news, updates, and announcements</CardDescription>
            </div>
            {canCreate && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Post
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="border border-muted">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={post.profiles?.avatar_url} />
                        <AvatarFallback>
                          {post.profiles?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold">{post.profiles?.full_name || 'Unknown'}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(post.published_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <Badge className={getPostTypeColor(post.post_type)}>
                      {post.post_type}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mt-4">{post.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>
                  
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="outline">#{tag}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{post.view_count || 0}</span>
                    </div>
                    {post.is_featured && (
                      <Badge variant="secondary">Featured</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      <CreatePostDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        companyId={companyId}
        onPostCreated={handlePostCreated}
      />
    </>
  );
};
