import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Repeat2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface RepostButtonProps {
  postId: string;
  repostCount: number;
  onUpdate: () => void;
}

export function RepostButton({ postId, repostCount, onUpdate }: RepostButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRepost = async () => {
    if (!user) {
      toast.error("Please sign in to repost");
      return;
    }

    setLoading(true);
    try {
      // Create a new post that references the original
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: comment,
          repost_of: postId,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Track the repost
      await supabase
        .from('post_reposts')
        .insert({
          original_post_id: postId,
          reposted_by: user.id
        });

      toast.success("Post reposted to your feed");
      setOpen(false);
      setComment("");
      onUpdate();
    } catch (error) {
      console.error('Error reposting:', error);
      toast.error("Failed to repost");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Repeat2 className="w-4 h-4" />
          <span className="text-xs">{repostCount > 0 ? repostCount : 'Repost'}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle>Repost to your feed</DialogTitle>
          <DialogDescription>
            Add your thoughts (optional) before reposting
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[100px] glass-subtle"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRepost} disabled={loading}>
              {loading ? "Reposting..." : "Repost"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
