import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePageMentions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: unreadMentions = [], isLoading } = useQuery({
    queryKey: ["page-mentions-unread"],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("page_mentions")
        .select("*, workspace_pages(id, title)")
        .eq("mentioned_user_id", user.id)
        .is("read_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createMention = useMutation({
    mutationFn: async ({
      pageId,
      commentId,
      mentionedUserId,
    }: {
      pageId: string;
      commentId?: string;
      mentionedUserId: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("page_mentions").insert({
        page_id: pageId,
        comment_id: commentId || null,
        mentioned_user_id: mentionedUserId,
        mentioned_by: user.id,
      });

      if (error) throw error;
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (mentionId: string) => {
      const { error } = await supabase
        .from("page_mentions")
        .update({ read_at: new Date().toISOString() })
        .eq("id", mentionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-mentions-unread"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("page_mentions")
        .update({ read_at: new Date().toISOString() })
        .eq("mentioned_user_id", user.id)
        .is("read_at", null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-mentions-unread"] });
    },
  });

  return {
    unreadMentions,
    unreadCount: unreadMentions.length,
    isLoading,
    createMention,
    markAsRead,
    markAllAsRead,
  };
}
