import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { ensureValidToken } from "../_shared/token-refresh.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  replyToEmailId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body, replyToEmailId }: SendEmailRequest = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Get user's active email connection
    const { data: connection, error: connError } = await supabase
      .from("email_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      throw new Error("No active email connection found");
    }

    // Ensure we have a valid access token
    const { accessToken, error: tokenError } = await ensureValidToken(
      connection.id,
      connection.provider
    );

    if (tokenError || !accessToken) {
      throw new Error(`Token refresh failed: ${tokenError || "No access token"}`);
    }

    let threadId = undefined;
    let inReplyTo = undefined;
    let references = undefined;

    // If replying, get original email details
    if (replyToEmailId) {
      const { data: originalEmail } = await supabase
        .from("emails")
        .select("thread_id, external_id, raw_headers")
        .eq("id", replyToEmailId)
        .single();

      if (originalEmail) {
        threadId = originalEmail.thread_id;
        inReplyTo = originalEmail.raw_headers?.["message-id"];
        references = originalEmail.raw_headers?.references || inReplyTo;
      }
    }

    let sentEmailId = "";

    if (connection.provider === "gmail") {
      // Create email in RFC 2822 format
      const emailLines = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/html; charset=utf-8`,
      ];

      if (inReplyTo) {
        emailLines.push(`In-Reply-To: ${inReplyTo}`);
        emailLines.push(`References: ${references}`);
      }

      emailLines.push("");
      emailLines.push(body);

      const email = emailLines.join("\r\n");
      const encodedEmail = btoa(email).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      // Send via Gmail API
      const sendUrl = threadId 
        ? `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`
        : `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`;

      const sendResponse = await fetch(sendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: encodedEmail,
          threadId: threadId,
        }),
      });

      if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        console.error("Gmail send error:", errorText);
        throw new Error(`Failed to send email: ${sendResponse.statusText}`);
      }

      const sentData = await sendResponse.json();
      sentEmailId = sentData.id;
      threadId = sentData.threadId;

    } else if (connection.provider === "outlook") {
      // Send via Microsoft Graph API
      const message = {
        subject: subject,
        body: {
          contentType: "HTML",
          content: body,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
      };

      const sendResponse = await fetch(
        "https://graph.microsoft.com/v1.0/me/sendMail",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message, saveToSentItems: true }),
        }
      );

      if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        console.error("Outlook send error:", errorText);
        throw new Error(`Failed to send email: ${sendResponse.statusText}`);
      }
    }

    // Store sent email in database
    const { error: insertError } = await supabase.from("emails").insert({
      user_id: user.id,
      connection_id: connection.id,
      external_id: sentEmailId || `local-${Date.now()}`,
      thread_id: threadId,
      subject: subject,
      from_email: connection.email_address,
      from_name: user.email || "",
      to_emails: [{ email: to, name: null }],
      body_html: body,
      body_text: body.replace(/<[^>]*>/g, ""),
      snippet: body.substring(0, 100),
      status: "sent",
      is_read: true,
      is_starred: false,
      has_attachments: false,
      attachment_count: 0,
      email_date: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Error storing sent email:", insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        threadId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
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
