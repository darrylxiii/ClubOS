import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { ensureValidToken } from "../_shared/token-refresh.ts";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

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
    const { connectionId, maxResults }: SyncRequest = await req.json();

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

    // Helper to format date for Gmail API (YYYY/MM/DD)
    const formatGmailDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    };

    // Determine sync parameters
    const isFirstSync = !connection.last_sync_at;
    const effectiveMaxResults = maxResults || (isFirstSync ? 100 : 50);
    
    // Get date range - 90 days for first sync, incremental after
    const syncDate = isFirstSync 
      ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      : new Date(connection.last_sync_at);
    const afterDate = formatGmailDate(syncDate);

    let totalEmailsInserted = 0;

    // Sync inbox emails
    console.log(`Syncing inbox emails after ${afterDate}...`);
    const inboxResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${effectiveMaxResults}&q=after:${afterDate} in:inbox`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!inboxResponse.ok) {
      throw new Error(`Gmail API error: ${inboxResponse.statusText}`);
    }

    const inboxData = await inboxResponse.json();
    const inboxMessages = inboxData.messages || [];

    // Process inbox emails
    for (const message of inboxMessages) {
      try {
          const detailResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

        const emailData = await detailResponse.json();
        const headers = parseHeaders(emailData.payload.headers);
        const body = parseBody(emailData.payload);
        
        const fromEmail = extractEmail(headers.from || "");
        const avatarUrl = await getGravatarUrl(fromEmail);

        // Insert email
        const { error: insertError } = await supabase.from("emails").upsert(
          {
            user_id: connection.user_id,
            connection_id: connectionId,
            external_id: emailData.id,
            thread_id: emailData.threadId,
            subject: headers.subject || "(No Subject)",
            from_email: fromEmail,
            from_name: extractName(headers.from || ""),
            from_avatar_url: avatarUrl,
            to_emails: parseEmailList(headers.to || ""),
            cc_emails: parseEmailList(headers.cc || ""),
            reply_to: headers["reply-to"],
            body_text: body.text,
            body_html: body.html,
            snippet: emailData.snippet,
            status: "inbox",
            is_read: emailData.labelIds?.includes("UNREAD") ? false : true,
            is_starred: emailData.labelIds?.includes("STARRED") || false,
            has_attachments: body.hasAttachments,
            attachment_count: body.attachmentCount,
            email_date: new Date(parseInt(emailData.internalDate)).toISOString(),
            raw_headers: headers,
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

    // Sync sent emails
    console.log(`Syncing sent emails after ${afterDate}...`);
    const sentResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${effectiveMaxResults}&q=after:${afterDate} in:sent`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (sentResponse.ok) {
      const sentData = await sentResponse.json();
      const sentMessages = sentData.messages || [];

      for (const message of sentMessages) {
        try {
          const detailResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          const emailData = await detailResponse.json();
          const headers = parseHeaders(emailData.payload.headers);
          const body = parseBody(emailData.payload);
          
          const fromEmail = extractEmail(headers.from || "");
          const avatarUrl = await getGravatarUrl(fromEmail);

          await supabase.from("emails").upsert(
            {
              user_id: connection.user_id,
              connection_id: connectionId,
              external_id: emailData.id,
              thread_id: emailData.threadId,
              subject: headers.subject || "(No Subject)",
              from_email: fromEmail,
              from_name: extractName(headers.from || ""),
              from_avatar_url: avatarUrl,
              to_emails: parseEmailList(headers.to || ""),
              cc_emails: parseEmailList(headers.cc || ""),
              reply_to: headers["reply-to"],
              body_text: body.text,
              body_html: body.html,
              snippet: emailData.snippet,
              status: "sent",
              is_read: true,
              is_starred: emailData.labelIds?.includes("STARRED") || false,
              has_attachments: body.hasAttachments,
              attachment_count: body.attachmentCount,
              email_date: new Date(parseInt(emailData.internalDate)).toISOString(),
              raw_headers: headers,
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
    console.error("Error syncing Gmail emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

function parseHeaders(headers: any[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const header of headers) {
    result[header.name.toLowerCase()] = header.value;
  }
  return result;
}

function parseBody(payload: any): {
  text: string;
  html: string;
  hasAttachments: boolean;
  attachmentCount: number;
} {
  let text = "";
  let html = "";
  let attachmentCount = 0;

  function traverse(part: any) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      text += decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data) {
      html += decodeBase64Url(part.body.data);
    } else if (part.filename) {
      attachmentCount++;
    }

    if (part.parts) {
      part.parts.forEach(traverse);
    }
  }

  traverse(payload);

  return {
    text,
    html,
    hasAttachments: attachmentCount > 0,
    attachmentCount,
  };
}

function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return atob(base64);
  } catch {
    return "";
  }
}

function extractEmail(fullString: string): string {
  const match = fullString.match(/<(.+?)>/);
  return match ? match[1] : fullString.trim();
}

function extractName(fullString: string): string {
  const match = fullString.match(/^(.+?)\s*</);
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : extractEmail(fullString);
}

function parseEmailList(emailString: string): any[] {
  if (!emailString) return [];
  return emailString.split(",").map((e) => {
    const email = extractEmail(e);
    const name = extractName(e);
    return { email, name: name === email ? null : name };
  });
}

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
