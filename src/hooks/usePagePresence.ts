import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

export interface PresenceUser {
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  is_editing: boolean;
  online_at: string;
}

/**
 * Realtime Presence via Supabase channels — zero DB writes.
 * Derives channel name from current pathname so all users on the same route sync.
 */
export function usePagePresence() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();
  const [viewers, setViewers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;

    // Normalize: strip trailing slash, lowercase
    const normalized = location.pathname.replace(/\/+$/, "").toLowerCase() || "/";
    const channelName = `presence:${normalized}`;

    // Unsubscribe previous channel if route changed
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(channelName, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{
          user_id: string;
          user_name: string;
          user_avatar: string | null;
          is_editing: boolean;
          online_at: string;
        }>();

        const users: PresenceUser[] = [];
        for (const [userId, presences] of Object.entries(state)) {
          if (userId === user.id) continue; // exclude self
          const latest = presences[presences.length - 1];
          if (latest) {
            users.push({
              user_id: userId,
              user_name: latest.user_name || "Unknown",
              user_avatar: latest.user_avatar || null,
              is_editing: latest.is_editing || false,
              online_at: latest.online_at || new Date().toISOString(),
            });
          }
        }
        setViewers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            user_name: profile?.full_name || user.email?.split("@")[0] || "Unknown",
            user_avatar: profile?.avatar_url || null,
            is_editing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setViewers([]);
    };
  }, [user, profile?.full_name, profile?.avatar_url, location.pathname]);

  const setEditing = async (isEditing: boolean) => {
    if (!channelRef.current || !user) return;
    await channelRef.current.track({
      user_id: user.id,
      user_name: profile?.full_name || "Unknown",
      user_avatar: profile?.avatar_url || null,
      is_editing: isEditing,
      online_at: new Date().toISOString(),
    });
  };

  return {
    viewers,
    count: viewers.length,
    setEditing,
  };
}
