import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MessageCircle, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MilestoneCommentsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestoneId: string;
}

interface Comment {
  id: string;
  milestone_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function MilestoneCommentsDrawer({
  open,
  onOpenChange,
  milestoneId,
}: MilestoneCommentsDrawerProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && milestoneId) {
      loadComments();
    }
  }, [open, milestoneId]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      // Note: milestone_comments table needs to be created via migration
      // For now, we'll try to load and handle gracefully if table doesn't exist
      const { data, error } = await supabase
        .from("milestone_comments" as any)
        .select(`
          *,
          profiles:user_id(full_name, avatar_url)
        `)
        .eq("milestone_id", milestoneId)
        .order("created_at", { ascending: true });

      if (error) {
        // If table doesn't exist, show empty state
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.warn('milestone_comments table not found. Please create migration.');
          setComments([]);
          return;
        }
        throw error;
      }
      setComments(data && Array.isArray(data) ? data as unknown as Comment[] : []);
    } catch (error: any) {
      console.error("Error loading comments:", error);
      // Don't show error toast if table doesn't exist
      if (!error.message?.includes('does not exist')) {
        toast.error("Failed to load comments");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("milestone_comments" as any)
        .insert({
          milestone_id: milestoneId,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          toast.error("Comments feature requires database migration. Please contact support.");
          return;
        }
        throw error;
      }

      setNewComment("");
      await loadComments();
      toast.success("Comment added");
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Milestone Comments
          </SheetTitle>
          <SheetDescription>
            Discuss this milestone with your team
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Comments List */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No comments yet. Start the conversation!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                    <AvatarFallback>
                      {comment.profiles?.full_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-muted rounded-lg p-3">
                      <p className="font-semibold text-sm mb-1">
                        {comment.profiles?.full_name || "Unknown"}
                      </p>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-3">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          {user && (
            <div className="border-t pt-4 space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
                size="sm"
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

