import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pin, PinOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PostPinningProps {
  postId: string;
  isPinned: boolean;
  onToggle: () => void;
}

export function PostPinning({ postId, isPinned, onToggle }: PostPinningProps) {
  const { user } = useAuth();
  const [pinnedCount, setPinnedCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkPinnedCount();
    }
  }, [user]);

  const checkPinnedCount = async () => {
    if (!user) return;

    const { count } = await supabase
      .from('pinned_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    setPinnedCount(count || 0);
  };

  const handleTogglePin = async () => {
    if (!user) {
      toast.error("Please sign in to pin posts");
      return;
    }

    if (!isPinned && pinnedCount >= 3) {
      toast.error("You can only pin up to 3 posts. Unpin a post first.");
      return;
    }

    setLoading(true);
    try {
      if (isPinned) {
        const { error } = await supabase
          .from('pinned_posts')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (error) throw error;
        toast.success("Post unpinned");
      } else {
        const { error } = await supabase
          .from('pinned_posts')
          .insert({
            user_id: user.id,
            post_id: postId,
            pinned_at: new Date().toISOString()
          });

        if (error) throw error;
        toast.success("Post pinned to your profile");
      }
      
      onToggle();
      checkPinnedCount();
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error("Failed to update pin status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleTogglePin}
      disabled={loading}
      className="gap-2"
    >
      {isPinned ? (
        <>
          <PinOff className="w-4 h-4" />
          <span className="text-xs">Unpin</span>
        </>
      ) : (
        <>
          <Pin className="w-4 h-4" />
          <span className="text-xs">Pin to profile</span>
        </>
      )}
    </Button>
  );
}
