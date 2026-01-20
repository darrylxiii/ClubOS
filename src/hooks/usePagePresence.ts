import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Presence {
  id: string;
  page_id: string;
  user_id: string;
  last_seen_at: string;
  cursor_position: any;
  is_editing: boolean;
  user_name?: string;
  user_avatar?: string;
}

export function usePagePresence(pageId: string | undefined) {
  const { user } = useAuth();
  const [viewers, setViewers] = useState<Presence[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, { full_name: string; avatar_url: string | null }>>({});

  // Update own presence
  useEffect(() => {
    if (!pageId || !user) return;

    const updatePresence = async () => {
      await supabase
        .from("page_presence")
        .upsert({
          page_id: pageId,
          user_id: user.id,
          last_seen_at: new Date().toISOString(),
          is_editing: false,
        }, { onConflict: "page_id,user_id" });
    };

    updatePresence();

    // Update presence every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      supabase
        .from("page_presence")
        .delete()
        .eq("page_id", pageId)
        .eq("user_id", user.id);
    };
  }, [pageId, user]);

  // Fetch current viewers
  useEffect(() => {
    if (!pageId) return;

    const fetchViewers = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data } = await supabase
        .from("page_presence")
        .select("*")
        .eq("page_id", pageId)
        .gte("last_seen_at", fiveMinutesAgo);

      if (data) {
        setViewers(data);

        // Fetch user profiles
        const userIds = [...new Set(data.map((p) => p.user_id))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", userIds);

          if (profiles) {
            const profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
            profiles.forEach((p) => {
              profileMap[p.id] = { full_name: p.full_name || "Unknown", avatar_url: p.avatar_url };
            });
            setUserProfiles(profileMap);
          }
        }
      }
    };

    fetchViewers();

    // Subscribe to changes
    const channel = supabase
      .channel(`page-presence-${pageId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "page_presence", filter: `page_id=eq.${pageId}` },
        () => {
          fetchViewers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pageId]);

  const setEditing = async (isEditing: boolean) => {
    if (!pageId || !user) return;

    await supabase
      .from("page_presence")
      .upsert({
        page_id: pageId,
        user_id: user.id,
        last_seen_at: new Date().toISOString(),
        is_editing: isEditing,
      }, { onConflict: "page_id,user_id" });
  };

  const viewersWithProfiles = viewers.map((v) => ({
    ...v,
    user_name: userProfiles[v.user_id]?.full_name || "Unknown",
    user_avatar: userProfiles[v.user_id]?.avatar_url || null,
  }));

  // Filter out current user from viewers list
  const otherViewers = viewersWithProfiles.filter((v) => v.user_id !== user?.id);

  return {
    viewers: otherViewers,
    setEditing,
  };
}
