import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LiveViewerCounterProps {
  postId: string;
  className?: string;
}

export const LiveViewerCounter = ({ postId, className }: LiveViewerCounterProps) => {
  const [activeViewers, setActiveViewers] = useState(0);
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    // Create a presence channel for this post
    const presenceChannel = supabase.channel(`post-presence-${postId}`, {
      config: {
        presence: {
          key: postId,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const count = Object.keys(state).length;
        setActiveViewers(count);
      })
      .on('presence', { event: 'join' }, () => {
        const state = presenceChannel.presenceState();
        const count = Object.keys(state).length;
        setActiveViewers(count);
      })
      .on('presence', { event: 'leave' }, () => {
        const state = presenceChannel.presenceState();
        const count = Object.keys(state).length;
        setActiveViewers(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this user as viewing
          await presenceChannel.track({
            viewing_at: new Date().toISOString(),
          });
        }
      });

    setChannel(presenceChannel);

    return () => {
      if (presenceChannel) {
        presenceChannel.untrack();
        presenceChannel.unsubscribe();
      }
    };
  }, [postId]);

  if (activeViewers === 0) return null;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1.5 animate-pulse",
        className
      )}
    >
      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
      <Eye className="h-3 w-3" />
      <span className="text-xs font-medium">
        {activeViewers} viewing now
      </span>
    </Badge>
  );
};