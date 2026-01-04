import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notify } from "@/lib/notify";
import { useEffect, useState } from "react";

interface Comment {
  id: string;
  page_id: string;
  block_id: string | null;
  user_id: string;
  content: string;
  parent_id: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_avatar?: string;
}

export function usePageComments(pageId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [userProfiles, setUserProfiles] = useState<Record<string, { full_name: string; avatar_url: string | null }>>({});

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["page-comments", pageId],
    queryFn: async () => {
      if (!pageId) return [];
      const { data, error } = await supabase
        .from("page_comments")
        .select("*")
        .eq("page_id", pageId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Comment[];
    },
    enabled: !!pageId,
  });

  // Fetch user profiles for comments
  useEffect(() => {
    const userIds = [...new Set(comments.map((c) => c.user_id))];
    if (userIds.length === 0) return;

    supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds)
      .then(({ data }) => {
        if (data) {
          const profiles: Record<string, { full_name: string; avatar_url: string | null }> = {};
          data.forEach((p) => {
            profiles[p.id] = { full_name: p.full_name || "Unknown", avatar_url: p.avatar_url };
          });
          setUserProfiles(profiles);
        }
      });
  }, [comments]);

  // Real-time subscription
  useEffect(() => {
    if (!pageId) return;

    const channel = supabase
      .channel(`page-comments-${pageId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "page_comments", filter: `page_id=eq.${pageId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["page-comments", pageId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pageId, queryClient]);

  const addComment = useMutation({
    mutationFn: async ({ content, blockId, parentId }: { content: string; blockId?: string; parentId?: string }) => {
      if (!user || !pageId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("page_comments")
        .insert({
          page_id: pageId,
          user_id: user.id,
          content,
          block_id: blockId || null,
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-comments", pageId] });
    },
    onError: () => {
      notify.error("Failed to add comment");
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const { error } = await supabase
        .from("page_comments")
        .update({ content })
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-comments", pageId] });
    },
    onError: () => {
      notify.error("Failed to update comment");
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("page_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-comments", pageId] });
      notify.success("Comment deleted");
    },
    onError: () => {
      notify.error("Failed to delete comment");
    },
  });

  const resolveComment = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("page_comments")
        .update({ resolved_at: new Date().toISOString(), resolved_by: user.id })
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-comments", pageId] });
      notify.success("Comment resolved");
    },
    onError: () => {
      notify.error("Failed to resolve comment");
    },
  });

  const unresolveComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("page_comments")
        .update({ resolved_at: null, resolved_by: null })
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-comments", pageId] });
    },
  });

  const commentsWithProfiles = comments.map((c) => ({
    ...c,
    user_name: userProfiles[c.user_id]?.full_name || "Unknown",
    user_avatar: userProfiles[c.user_id]?.avatar_url || null,
  }));

  return {
    comments: commentsWithProfiles,
    isLoading,
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
    unresolveComment,
  };
}
