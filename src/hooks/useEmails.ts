import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  is_important: boolean;
  ai_category: string | null;
  ai_priority: number | null;
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
  read_at: string | null;
  archived_at: string | null;
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
  const { toast } = useToast();
  const { user } = useAuth();

  const loadEmails = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("emails")
        .select("*")
        .is("deleted_at", null)
        .order("email_date", { ascending: false });

      if (filter === "inbox") {
        query = query.eq("status", "inbox");
      } else if (filter === "starred") {
        query = query.eq("is_starred", true);
      } else if (filter === "snoozed") {
        query = query.not("snoozed_until", "is", null);
      } else if (filter === "archived") {
        query = query.eq("status", "archived");
      } else if (filter === "trash") {
        query = query.eq("status", "trash");
      }

      const { data, error } = await query;

      if (error) throw error;
      setEmails(data || []);
    } catch (error: any) {
      console.error("Error loading emails:", error);
      toast({
        title: "Error loading emails",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLabels = async () => {
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
  };

  const syncEmails = async () => {
    setSyncing(true);
    try {
      // Get active email connections
      const { data: connections } = await supabase
        .from("email_connections")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_active", true);

      if (!connections || connections.length === 0) {
        toast({
          title: "No email accounts",
          description: "Please connect an email account in settings",
        });
        return;
      }

      let totalSynced = 0;

      // Sync each connection
      for (const connection of connections) {
        try {
          const functionName =
            connection.provider === "gmail"
              ? "sync-gmail-emails"
              : "sync-outlook-emails";

          const { data, error } = await supabase.functions.invoke(functionName, {
            body: { connectionId: connection.id, maxResults: 50 },
          });

          if (error) throw error;

          totalSynced += data?.emailsSynced || 0;
        } catch (error: any) {
          console.error(`Error syncing ${connection.provider}:`, error);
        }
      }

      toast({
        title: "Sync complete",
        description: `Synced ${totalSynced} new email(s) from ${connections.length} account(s)`,
      });

      // Reload emails
      await loadEmails();

      // Trigger AI processing for unprocessed emails
      const { data: unprocessedEmails } = await supabase
        .from("emails")
        .select("id")
        .eq("user_id", user!.id)
        .is("ai_processed", false)
        .limit(10);

      if (unprocessedEmails && unprocessedEmails.length > 0) {
        for (const email of unprocessedEmails) {
          try {
            await supabase.functions.invoke("process-email-ai", {
              body: { emailId: email.id },
            });
          } catch (error) {
            console.error("Error processing email:", email.id, error);
          }
        }
      }
    } catch (error: any) {
      console.error("Error syncing emails:", error);
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const updateEmail = async (
    emailId: string,
    updates: Partial<Email>
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from("emails")
        .update(updates)
        .eq("id", emailId);

      if (error) throw error;

      // Update local state
      setEmails((prev) =>
        prev.map((email) =>
          email.id === emailId ? { ...email, ...updates } : email
        )
      );
    } catch (error: any) {
      console.error("Error updating email:", error);
      throw error;
    }
  };

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
    await updateEmail(emailId, { is_starred: starred } as Partial<Email>);
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

    // Subscribe to real-time changes
    const channel = supabase
      .channel("emails")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emails",
        },
        () => {
          loadEmails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

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
  };
}
