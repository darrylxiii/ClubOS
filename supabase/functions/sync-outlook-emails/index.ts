import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  connectionId: string;
  maxResults?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connectionId, maxResults = 50 }: SyncRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get connection details
    const { data: connection, error: connError } = await supabase
      .from("email_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (connError || !connection) {
      throw new Error("Connection not found");
    }

    // Log sync start
    const { data: syncLog } = await supabase
      .from("email_sync_log")
      .insert({
        connection_id: connectionId,
        sync_type: "manual",
        status: "started",
      })
      .select()
      .single();

    // Get last sync timestamp
    const lastSync = connection.last_sync_at || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch emails from Microsoft Graph API
    const listResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$top=${maxResults}&$filter=receivedDateTime ge ${lastSync}&$orderby=receivedDateTime desc`,
      {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
        },
      }
    );

    if (!listResponse.ok) {
      throw new Error(`Outlook API error: ${listResponse.statusText}`);
    }

    const listData = await listResponse.json();
    const messages = listData.value || [];

    let emailsInserted = 0;

    // Store each email
    for (const message of messages) {
      try {
        const { error: insertError } = await supabase.from("emails").upsert(
          {
            user_id: connection.user_id,
            connection_id: connectionId,
            external_id: message.id,
            thread_id: message.conversationId,
            subject: message.subject || "(No Subject)",
            from_email: message.from?.emailAddress?.address || "",
            from_name: message.from?.emailAddress?.name || "",
            to_emails: (message.toRecipients || []).map((r: any) => ({
              email: r.emailAddress?.address,
              name: r.emailAddress?.name,
            })),
            cc_emails: (message.ccRecipients || []).map((r: any) => ({
              email: r.emailAddress?.address,
              name: r.emailAddress?.name,
            })),
            bcc_emails: (message.bccRecipients || []).map((r: any) => ({
              email: r.emailAddress?.address,
              name: r.emailAddress?.name,
            })),
            reply_to: message.replyTo?.[0]?.emailAddress?.address,
            body_text: message.body?.contentType === "text" ? message.body?.content : null,
            body_html: message.body?.contentType === "html" ? message.body?.content : null,
            snippet: message.bodyPreview,
            status: "inbox",
            is_read: message.isRead,
            is_starred: message.flag?.flagStatus === "flagged",
            has_attachments: message.hasAttachments,
            attachment_count: message.hasAttachments ? 1 : 0,
            email_date: message.receivedDateTime,
            raw_headers: {
              importance: message.importance,
              internetMessageId: message.internetMessageId,
            },
          },
          { onConflict: "connection_id,external_id" }
        );

        if (!insertError) {
          emailsInserted++;
        }
      } catch (err) {
        console.error("Error processing email:", message.id, err);
      }
    }

    // Update sync log
    await supabase
      .from("email_sync_log")
      .update({
        status: "completed",
        emails_fetched: emailsInserted,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncLog.id);

    // Update connection last_sync_at
    await supabase
      .from("email_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", connectionId);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSynced: emailsInserted,
        totalMessages: messages.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error syncing Outlook emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
