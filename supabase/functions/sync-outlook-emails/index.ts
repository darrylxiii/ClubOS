import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { ensureValidToken } from "../_shared/token-refresh.ts";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

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

    // Ensure we have a valid access token
    const { accessToken, error: tokenError } = await ensureValidToken(
      connectionId,
      connection.provider
    );

    if (tokenError || !accessToken) {
      throw new Error(`Token refresh failed: ${tokenError || "No access token"}`);
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

    // Determine sync parameters
    const isFirstSync = !connection.last_sync_at;
    const effectiveMaxResults = maxResults || (isFirstSync ? 100 : 50);
    
    // Get date range - 90 days for first sync, incremental after
    const syncDate = isFirstSync 
      ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      : new Date(connection.last_sync_at);
    
    let totalEmailsInserted = 0;

    // Fetch inbox emails from Microsoft Graph API
    console.log(`Syncing inbox emails from ${syncDate.toISOString()}...`);
    const inboxResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=${effectiveMaxResults}&$filter=receivedDateTime ge ${syncDate.toISOString()}&$orderby=receivedDateTime desc`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!inboxResponse.ok) {
      throw new Error(`Outlook API error: ${inboxResponse.statusText}`);
    }

    const inboxData = await inboxResponse.json();
    const inboxMessages = inboxData.value || [];

    // Store inbox emails
    for (const message of inboxMessages) {
      try {
        const fromEmail = message.from?.emailAddress?.address || "";
        const avatarUrl = await getGravatarUrl(fromEmail);
        
        const { error: insertError } = await supabase.from("emails").upsert(
          {
            user_id: connection.user_id,
            connection_id: connectionId,
            external_id: message.id,
            thread_id: message.conversationId,
            subject: message.subject || "(No Subject)",
            from_email: fromEmail,
            from_name: message.from?.emailAddress?.name || "",
            from_avatar_url: avatarUrl,
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
          totalEmailsInserted++;
        }
      } catch (err) {
        console.error("Error processing inbox email:", message.id, err);
      }
    }

    // Fetch sent emails
    console.log(`Syncing sent emails from ${syncDate.toISOString()}...`);
    const sentResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/mailFolders/sentitems/messages?$top=${effectiveMaxResults}&$filter=sentDateTime ge ${syncDate.toISOString()}&$orderby=sentDateTime desc`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (sentResponse.ok) {
      const sentData = await sentResponse.json();
      const sentMessages = sentData.value || [];

      for (const message of sentMessages) {
        try {
          const fromEmail = message.from?.emailAddress?.address || "";
          const avatarUrl = await getGravatarUrl(fromEmail);
          
          await supabase.from("emails").upsert(
            {
              user_id: connection.user_id,
              connection_id: connectionId,
              external_id: message.id,
              thread_id: message.conversationId,
              subject: message.subject || "(No Subject)",
              from_email: fromEmail,
              from_name: message.from?.emailAddress?.name || "",
              from_avatar_url: avatarUrl,
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
              status: "sent",
              is_read: true,
              is_starred: message.flag?.flagStatus === "flagged",
              has_attachments: message.hasAttachments,
              attachment_count: message.hasAttachments ? 1 : 0,
              email_date: message.sentDateTime,
              raw_headers: {
                importance: message.importance,
                internetMessageId: message.internetMessageId,
              },
            },
            { onConflict: "connection_id,external_id" }
          );

          totalEmailsInserted++;
        } catch (err) {
          console.error("Error processing sent email:", message.id, err);
        }
      }
    }

    // Update sync log
    await supabase
      .from("email_sync_log")
      .update({
        status: "completed",
        emails_fetched: totalEmailsInserted,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncLog.id);

    // Update connection last_sync_at
    await supabase
      .from("email_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", connectionId);

    console.log(`Successfully synced ${totalEmailsInserted} emails (inbox + sent)`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSynced: totalEmailsInserted,
        inboxCount: inboxMessages.length,
        isFirstSync,
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

async function getGravatarUrl(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `https://www.gravatar.com/avatar/${hashHex}?d=mp&s=200`;
}

serve(handler);
