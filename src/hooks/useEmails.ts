import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { useAuth } from "@/contexts/AuthContext";
export interface Email {
  id: string;
  user_id: string;
  connection_id: string;
  external_id: string;
  thread_id: string | null;
  subject: string;
  from_email: string;
  from_name: string | null;
  from_avatar_url: string | null;
  to_emails: any;
  cc_emails?: any;
  bcc_emails?: any;
  reply_to?: string | null;
  body_text: string | null;
  body_html: string | null;
  snippet: string | null;
  status: string;
  is_read: boolean;
  is_starred: boolean;
  starred?: boolean; // Alias for compatibility
  is_important: boolean;
  ai_category: string | null;
  ai_priority: number | null;
  ai_priority_score?: number | null;
  ai_priority_reason?: string | null;
  inbox_type?: string | null;
  ai_summary: string | null;
  ai_sentiment: string | null;
  ai_action_items: any | null;
  ai_processed_at: string | null;
  assigned_to: string | null;
  snoozed_until: string | null;
  reminder_at: string | null;
  has_attachments: boolean;
  attachment_count: number;
  email_date: string;
  received_at: string;
  sender_email?: string; // Alias for from_email
  read_at: string | null;
  archived_at: string | null;
  archived?: boolean; // Helper flag
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  raw_headers: any;
  metadata: any;
}

export interface EmailLabel {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: string;
  sort_order: number;
}

export function useEmails(filter: string = "inbox") {
  const [emails, setEmails] = useState<Email[]>([]);
  const [labels, setLabels] = useState<EmailLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 50;

  const loadEmails = useCallback(async (cursor?: string) => {
    try {
      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setHasMore(true);
      }

      console.log('[useEmails] Loading emails for filter:', filter, cursor ? `(cursor: ${cursor})` : '(initial)');
      let query = supabase
        .from("emails")
        .select("*")
        .is("deleted_at", null)
        .order("email_date", { ascending: false })
        .limit(PAGE_SIZE);

      if (filter === "inbox") {
        query = query.eq("status", "inbox").is("archived_at", null);
      } else if (filter === "sent") {
        query = query.eq("status", "sent");
      } else if (filter === "starred") {
        query = query.eq("is_starred", true);
      } else if (filter === "snoozed") {
        query = query.not("snoozed_until", "is", null);
      } else if (filter === "archived") {
        query = query.eq("status", "archived");
      } else if (filter === "trash") {
        query = query.eq("status", "trash");
      }

      if (cursor) {
        query = query.lt("email_date", cursor);
      }

      const { data, error } = await query;

      if (error) throw error;

      const newEmails = data || [];
      const hasNextPage = newEmails.length === PAGE_SIZE;
      setHasMore(hasNextPage);

      console.log('[useEmails] Loaded', newEmails.length, 'emails');

      setEmails(prev => {
        if (cursor) {
          // Avoid duplicates if any
          const existingIds = new Set(prev.map(e => e.id));
          const uniqueNew = newEmails.filter(e => !existingIds.has(e.id));
          return [...prev, ...uniqueNew];
        }
        return newEmails;
      });

    } catch (error: any) {
      console.error("Error loading emails:", error);
      notify.error("Error loading emails", { description: error.message });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && emails.length > 0) {
      const lastEmail = emails[emails.length - 1];
      loadEmails(lastEmail.email_date);
    }
  }, [loadingMore, hasMore, emails, loadEmails]);

  const loadLabels = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("email_labels")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      setLabels(data || []);
    } catch (error: any) {
      console.error("Error loading labels:", error);
    }
  }, []);

  const syncEmails = async () => {
    if (!user) {
      notify.error("Please sign in to sync emails");
      return;
    }

    setSyncing(true);
    try {
      // Get active email connections
      const { data: connections } = await supabase
        .from("email_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (!connections || connections.length === 0) {
        notify.info("No email accounts", { description: "Please connect an email account in settings" });
        return;
      }

      let totalSynced = 0;

      // Sync each connection
      for (const connection of connections) {
        const functionName =
          connection.provider === "gmail"
            ? "sync-gmail-emails"
            : "sync-outlook-emails";

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
          const { data, error } = await supabase.functions.invoke(functionName, {
            body: { connectionId: connection.id, maxResults: 50 },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          if (error) throw error;

          totalSynced += data?.emailsSynced || 0;
        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            console.error(`${connection.provider} sync timed out after 60s`);
          } else {
            console.error(`Error syncing ${connection.provider}:`, error);
          }
        }
      }

      notify.success("Sync complete", { description: `Synced ${totalSynced} new email(s) from ${connections.length} account(s)` });

      // Reload emails
      await loadEmails();

      // Trigger AI processing for unprocessed emails
      if (!user) return;

      const { data: unprocessedEmails } = await supabase
        .from("emails")
        .select("id")
        .eq("user_id", user.id)
        .is("ai_processed_at", null)
        .limit(10);

      if (unprocessedEmails && unprocessedEmails.length > 0) {
        console.log(`[useEmails] Processing ${unprocessedEmails.length} emails with AI in parallel (max 5 concurrent)...`);

        // Process in batches of 5
        const batchSize = 5;
        for (let i = 0; i < unprocessedEmails.length; i += batchSize) {
          const batch = unprocessedEmails.slice(i, i + batchSize);
          const promises = batch.map(email => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            return supabase.functions.invoke("process-email-ai", {
              body: { emailId: email.id },
              signal: controller.signal,
            }).catch(error => {
              clearTimeout(timeoutId);
              if (error.name === 'AbortError') {
                console.error("Email AI processing timed out:", email.id);
              } else {
                console.error("Error processing email:", email.id, error);
              }
              return { error };
            }).finally(() => clearTimeout(timeoutId));
          });

          await Promise.allSettled(promises);
          console.log(`[useEmails] Processed batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(unprocessedEmails.length / batchSize)}`);
        }

        console.log(`[useEmails] AI processing complete`);
      }
    } catch (error: any) {
      console.error("Error syncing emails:", error);
      notify.error("Sync failed", { description: error.message });
    } finally {
      setSyncing(false);
    }
  };

  const updateEmail = useCallback(async (
    emailId: string,
    updates: Partial<Email>
  ): Promise<void> => {
    try {
      // Optimistic update
      setEmails((prev) =>
        prev.map((email) =>
          email.id === emailId ? { ...email, ...updates } : email
        )
      );

      const { error } = await supabase
        .from("emails")
        .update(updates)
        .eq("id", emailId);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error updating email:", error);
      // Reload emails on error to revert optimistic update
      await loadEmails();
      throw error;
    }
  }, [loadEmails]);

  const markAsRead = async (emailId: string) => {
    await updateEmail(emailId, {
      is_read: true,
      read_at: new Date().toISOString(),
    } as Partial<Email>);
  };

  const markAsUnread = async (emailId: string) => {
    await updateEmail(emailId, {
      is_read: false,
      read_at: null,
    } as Partial<Email>);
  };

  const toggleStar = async (emailId: string, starred: boolean) => {
    try {
      await updateEmail(emailId, { is_starred: starred } as Partial<Email>);
    } catch (error: any) {
      notify.error("Failed to update", { description: error.message });
    }
  };

  const archiveEmail = async (emailId: string) => {
    await updateEmail(emailId, {
      status: "archived",
      archived_at: new Date().toISOString(),
    } as Partial<Email>);
  };

  const deleteEmail = async (emailId: string) => {
    await updateEmail(emailId, {
      status: "trash",
      deleted_at: new Date().toISOString(),
    } as Partial<Email>);
  };

  const snoozeEmail = async (emailId: string, until: Date) => {
    await updateEmail(emailId, {
      snoozed_until: until.toISOString(),
    } as Partial<Email>);
  };

  useEffect(() => {
    loadEmails();
    loadLabels();

    // Optimized realtime: update individual emails instead of full reload
    let reloadTimeout: number | null = null;

    const channel = supabase
      .channel("emails")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emails",
        },
        (payload) => {
          console.log('[useEmails] Realtime event:', payload.eventType, payload.new && 'id' in payload.new ? (payload.new as any).id : 'unknown');

          if (payload.eventType === 'INSERT' && payload.new) {
            // Add new email to list
            const newEmail = payload.new as Email;
            setEmails((prev) => [newEmail, ...prev]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            // Update existing email
            const updatedEmail = payload.new as Email;
            setEmails((prev) =>
              prev.map((email) =>
                email.id === updatedEmail.id ? updatedEmail : email
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            // Remove deleted email
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setEmails((prev) => prev.filter((email) => email.id !== deletedId));
            }
          }

          // Debounced full reload as fallback (for filter changes)
          if (reloadTimeout) clearTimeout(reloadTimeout);
          reloadTimeout = setTimeout(() => {
            console.log('[useEmails] Fallback reload after realtime events');
            loadEmails();
          }, 1000) as unknown as number;
        }
      )
      .subscribe();

    return () => {
      if (reloadTimeout) clearTimeout(reloadTimeout);
      supabase.removeChannel(channel);
    };
  }, [filter, loadEmails, loadLabels]);

  return {
    emails,
    labels,
    loading,
    syncing,
    syncEmails,
    markAsRead,
    markAsUnread,
    toggleStar,
    archiveEmail,
    deleteEmail,
    snoozeEmail,
    updateEmail,
    loadEmails,
    hasMore,
    loadMore,
    loadingMore,
  };
}
