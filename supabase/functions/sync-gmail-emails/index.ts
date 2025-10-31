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
    const afterTimestamp = Math.floor(new Date(lastSync).getTime() / 1000);

    // Fetch emails from Gmail API
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=after:${afterTimestamp}`,
      {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
        },
      }
    );

    if (!listResponse.ok) {
      throw new Error(`Gmail API error: ${listResponse.statusText}`);
    }

    const listData = await listResponse.json();
    const messages = listData.messages || [];

    let emailsInserted = 0;

    // Fetch and store each email
    for (const message of messages) {
      try {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
          {
            headers: {
              Authorization: `Bearer ${connection.access_token}`,
            },
          }
        );

        const emailData = await detailResponse.json();
        const headers = parseHeaders(emailData.payload.headers);
        const body = parseBody(emailData.payload);

        // Insert email
        const { error: insertError } = await supabase.from("emails").upsert(
          {
            user_id: connection.user_id,
            connection_id: connectionId,
            external_id: emailData.id,
            thread_id: emailData.threadId,
            subject: headers.subject || "(No Subject)",
            from_email: extractEmail(headers.from || ""),
            from_name: extractName(headers.from || ""),
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

serve(handler);
