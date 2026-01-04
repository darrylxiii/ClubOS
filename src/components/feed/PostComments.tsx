import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { notify } from "@/lib/notify";

interface PostCommentsProps {
  postId: string;
  postAuthorId: string;
  onCommentAdded: () => void;
}

export function PostComments({ postId, postAuthorId, onCommentAdded }: PostCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchComments();
    
    if (user) {
      supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setProfile(data));
    }
  }, [postId, user]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles:user_id(full_name, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      // Track comment engagement
      if (user.id !== postAuthorId) {
        try {
          await supabase.from('post_engagement_signals').upsert({
            user_id: user.id,
            post_id: postId,
            commented: true,
            commented_at: new Date().toISOString(),
          }, { onConflict: 'user_id,post_id' });

          await supabase.rpc('update_relationship_score', {
            p_user_id: user.id,
            p_related_user_id: postAuthorId,
          });
        } catch (trackingError) {
          // Non-critical: Log but don't block comment submission
          console.error('Error tracking comment engagement:', trackingError);
        }
      }

      setNewComment("");
      fetchComments();
      onCommentAdded();
    } catch (error) {
      console.error('Error posting comment:', error);
      notify.error("Failed to comment", { description: "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={comment.profiles?.avatar_url} />
            <AvatarFallback>
              {comment.profiles?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="bg-muted rounded-lg p-3">
              <p className="font-semibold text-sm">
                {comment.profiles?.full_name || "Unknown"}
              </p>
              <p className="text-sm mt-1">{comment.content}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-3">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
      
      {user && (
        <div className="flex gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback>
              {profile?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[60px] resize-none"
            />
            <Button
              onClick={handleComment}
              disabled={!newComment.trim() || loading}
              size="sm"
              className="mt-2"
            >
              Comment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}