import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface OnlineStatusIndicatorProps {
  userId: string;
  className?: string;
}

export const OnlineStatusIndicator = ({ userId, className }: OnlineStatusIndicatorProps) => {
  const [status, setStatus] = useState<'online' | 'away' | 'busy' | 'offline'>('offline');

  useEffect(() => {
    loadStatus();

    const channel = supabase
      .channel(`presence-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newStatus = payload.new as any;
          setStatus(newStatus.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadStatus = async () => {
    const { data } = await supabase
      .from('user_presence')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setStatus(data.status as any);
    }
  };

  const statusColors = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    busy: "bg-red-500",
    offline: "bg-gray-500",
  };

  return (
    <div
      className={cn(
        "w-3 h-3 rounded-full ring-2 ring-background",
        statusColors[status],
        status === 'online' && "animate-pulse",
        className
      )}
      title={status}
    />
  );
};
