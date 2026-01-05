import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProjectMessage {
  id: string;
  project_id: string | null;
  contract_id: string | null;
  sender_id: string;
  recipient_id: string;
  message: string;
  message_type: string;
  attachments: any[];
  metadata: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

interface SendMessageParams {
  projectId?: string;
  contractId?: string;
  recipientId: string;
  message: string;
  messageType?: string;
  attachments?: any[];
}

export function useProjectMessages(projectId?: string, contractId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ["project-messages", projectId || contractId];

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = (supabase as any)
        .from("project_messages")
        .select(`
          *,
          sender:profiles!project_messages_sender_id_fkey(id, full_name, avatar_url)
        `)
        .order("created_at", { ascending: true });

      if (projectId) {
        query = query.eq("project_id", projectId);
      } else if (contractId) {
        query = query.eq("contract_id", contractId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProjectMessage[];
    },
    enabled: !!(projectId || contractId) && !!user,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({
      projectId: pid,
      contractId: cid,
      recipientId,
      message,
      messageType = "text",
      attachments = [],
    }: SendMessageParams) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await (supabase as any)
        .from("project_messages")
        .insert({
          project_id: pid || projectId,
          contract_id: cid || contractId,
          sender_id: user.id,
          recipient_id: recipientId,
          message,
          message_type: messageType,
          attachments,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (messageIds: string[]) => {
      const { error } = await (supabase as any)
        .from("project_messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in("id", messageIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user || (!projectId && !contractId)) return;

    const channel = supabase
      .channel(`project-messages-${projectId || contractId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_messages",
          filter: projectId 
            ? `project_id=eq.${projectId}` 
            : `contract_id=eq.${contractId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, contractId, user, queryClient, queryKey]);

  // Get unread count
  const unreadCount = messages.filter(
    (m) => !m.is_read && m.recipient_id === user?.id
  ).length;

  return {
    messages,
    isLoading,
    sendMessage,
    markAsRead,
    unreadCount,
  };
}

// Hook for getting unread message count across all conversations
export function useUnreadMessagesCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-messages-count"],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await (supabase as any)
        .from("project_messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
