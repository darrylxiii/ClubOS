import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface OnlineStatusIndicatorProps {
  userId: string;
  className?: string;
  showCustomStatus?: boolean;
}

type UserStatus = 'online' | 'away' | 'dnd' | 'invisible' | 'offline';

export const OnlineStatusIndicator = ({ userId, className, showCustomStatus = false }: OnlineStatusIndicatorProps) => {
  const [status, setStatus] = useState<UserStatus>('offline');
  const [customStatus, setCustomStatus] = useState<string | null>(null);
  const [customEmoji, setCustomEmoji] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();

    // Update status every 30 seconds for real-time accuracy
    const interval = setInterval(loadStatus, 30000);

    const channel = supabase
      .channel(`presence-extended-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence_extended',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadStatus();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadStatus = async () => {
    const { data } = await supabase
      .from('user_presence_extended')
      .select('status, custom_status, custom_status_emoji')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      // Don't show invisible users as online
      const userStatus = data.status as UserStatus;
      setStatus(userStatus === 'invisible' ? 'offline' : userStatus);
      setCustomStatus(data.custom_status);
      setCustomEmoji(data.custom_status_emoji);
    }
  };

  const statusColors = {
    online: "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]",
    away: "bg-yellow-500",
    dnd: "bg-red-500",
    invisible: "bg-gray-400",
    offline: "bg-gray-400",
  };

  const statusLabels = {
    online: "Online",
    away: "Away",
    dnd: "Do Not Disturb",
    invisible: "Offline",
    offline: "Offline",
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "w-3 h-3 rounded-full ring-2 ring-background",
          statusColors[status],
          status === 'online' && "animate-pulse",
          className
        )}
        title={statusLabels[status]}
      />
      {showCustomStatus && (customStatus || customEmoji) && (
        <span className="text-xs text-muted-foreground">
          {customEmoji} {customStatus}
        </span>
      )}
    </div>
  );
};
