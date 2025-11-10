import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface OnlineStatusIndicatorProps {
  userId: string;
  className?: string;
}

// Calculate online status dynamically based on last activity
const calculateStatus = (lastActivity: string | null): 'online' | 'away' | 'busy' | 'offline' => {
  if (!lastActivity) return 'offline';
  
  const lastActivityTime = new Date(lastActivity).getTime();
  const now = Date.now();
  const minutesAgo = (now - lastActivityTime) / (1000 * 60);
  
  if (minutesAgo < 2) return 'online';
  if (minutesAgo < 30) return 'away';
  return 'offline';
};

export const OnlineStatusIndicator = ({ userId, className }: OnlineStatusIndicatorProps) => {
  const [status, setStatus] = useState<'online' | 'away' | 'busy' | 'offline'>('offline');

  useEffect(() => {
    loadStatus();

    // Update status every 30 seconds for real-time accuracy
    const interval = setInterval(loadStatus, 30000);

    const channel = supabase
      .channel(`presence-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_activity_tracking',
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
      .from('user_activity_tracking')
      .select('last_activity_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setStatus(calculateStatus(data.last_activity_at));
    }
  };

  const statusColors = {
    online: "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]",
    away: "bg-yellow-500",
    busy: "bg-red-500",
    offline: "bg-gray-400",
  };

  return (
    <div
      className={cn(
        "w-3 h-3 rounded-full ring-2 ring-background",
        statusColors[status],
        status === 'online' && "animate-pulse",
        className
      )}
      title={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  );
};
