import { useState } from "react";
import { aiService } from '@/services/aiService';
import { Button } from "@/components/ui/button";
import { Repeat2, MessageSquare, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RepostedPostCard } from "./RepostedPostCard";

interface RepostButtonProps {
  postId: string;
  repostCount: number;
  onUpdate: () => void;
  post?: any;
}

export function RepostButton({ postId, repostCount, onUpdate, post }: RepostButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);

  const handleQuickRepost = async () => {
    if (!user) {
      toast.error("Please sign in to repost");
      return;
    }

    setLoading(true);
    try {
      // Create a new post that references the original
      const { data: newPost, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: "",
          repost_of: postId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Track the repost with link to the actual post
      await supabase
        .from('post_reposts')
        .insert({
          original_post_id: postId,
          reposted_by: user.id,
          repost_post_id: newPost.id
        });

      toast.success("Reposted to your feed");
      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error reposting:', error);
      toast.error("Failed to repost");
    } finally {
      setLoading(false);
    }
  };

  const handleRepostWithComment = async () => {
    if (!user) {
      toast.error("Please sign in to repost");
      return;
    }

    setLoading(true);
    try {
      // Create a new post that references the original
      const { data: newPost, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: comment,
          repost_of: postId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Track the repost with link to the actual post
      await supabase
        .from('post_reposts')
        .insert({
          original_post_id: postId,
          reposted_by: user.id,
          repost_post_id: newPost.id
        });

      // Generate combined AI summary for repost with commentary
      if (comment.trim() && post?.content) {
        const combinedContent = `Original post: ${post.content}\n\nRepost commentary: ${comment}`;
        try {
          // Use aiService.generatePostSummary instead of direct invocation
          await aiService.generatePostSummary({
            postId: newPost.id, // Use newPost.id for the reposted post
            content: combinedContent,
            type: 'repost_with_commentary'
          });
          // No success toast here, as the main repost success is below.
          // AI summary generation is a background task.
        } catch (err) {
          console.error('Failed to generate AI summary:', err);
          // Non-critical: AI summary generation failure shouldn't block repost
          toast.error('Repost successful, but AI summary generation failed');
        }
      }

      toast.success("Reposted with your thoughts");
      setOpen(false);
      setComment("");
      setShowCommentBox(false);
      onUpdate();
    } catch (error) {
      console.error('Error reposting:', error);
      toast.error("Failed to repost");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setShowCommentBox(false);
        setComment("");
      }
    }}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          disabled={post?.repost_of !== null}
        >
          <Repeat2 className="w-4 h-4" />
          <span className="text-xs">{repostCount > 0 ? repostCount : 'Repost'}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:w-full max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto glass-card">
        <DialogHeader>
          <DialogTitle className="text-xl">Repost to your feed</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pb-2">
          {/* Original Post Preview */}
          {post && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Preview</label>
              <RepostedPostCard originalPost={post} />
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          {!showCommentBox ? (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="flex flex-col gap-3 h-auto py-6 hover:border-accent hover:bg-accent/5 transition-all"
                onClick={handleQuickRepost}
                disabled={loading}
              >
                <Zap className="h-6 w-6 text-accent" />
                <div className="space-y-1 text-center">
                  <div className="font-semibold">Repost</div>
                  <div className="text-xs text-muted-foreground">Share instantly</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col gap-3 h-auto py-6 hover:border-accent hover:bg-accent/5 transition-all"
                onClick={() => setShowCommentBox(true)}
              >
                <MessageSquare className="h-6 w-6 text-accent" />
                <div className="space-y-1 text-center">
                  <div className="font-semibold">Add thoughts</div>
                  <div className="text-xs text-muted-foreground">Include your comment</div>
                </div>
              </Button>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-200">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your thoughts</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What do you think about this?"
                  className="min-h-[120px] resize-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCommentBox(false);
                    setComment("");
                  }}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleRepostWithComment}
                  disabled={loading || !comment.trim()}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2" />
                      Posting...
                    </>
                  ) : (
                    "Repost with comment"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
