import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { ensureValidToken } from "../../_shared/token-refresh.ts";

const SendEmailSchema = z.object({
    to: z.string(),
    subject: z.string(),
    body: z.string(),
    replyToEmailId: z.string().optional(),
});

interface ActionContext {
    supabase: SupabaseClient;
    payload: any;
    userId: string | null;
}

export async function handleSendEmail({ supabase, payload, userId }: ActionContext) {
    const input = SendEmailSchema.parse(payload);

    if (!userId) throw new Error("Unauthorized");

    // 1. Get Connection
    const { data: connection, error: connError } = await supabase
        .from("email_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

    if (connError || !connection) throw new Error("No active email connection found");

    // 2. Token Refresh
    const { accessToken, error: tokenError } = await ensureValidToken(connection.id, connection.provider);
    if (tokenError || !accessToken) throw new Error(`Token refresh failed: ${tokenError}`);

    // 3. Threading Logic
    let threadId = undefined;
    let inReplyTo = undefined;
    let references = undefined;

    if (input.replyToEmailId) {
        const { data: original } = await supabase.from("emails").select("thread_id, external_id, raw_headers").eq("id", input.replyToEmailId).single();
        if (original) {
            threadId = original.thread_id;
            inReplyTo = original.raw_headers?.["message-id"];
            references = original.raw_headers?.references || inReplyTo;
        }
    }

    let sentEmailId = "";

    // 4. Provider Logic
    if (connection.provider === "gmail") {
        const emailLines = [`To: ${input.to}`, `Subject: ${input.subject}`, `Content-Type: text/html; charset=utf-8`];
        if (inReplyTo) { emailLines.push(`In-Reply-To: ${inReplyTo}`); emailLines.push(`References: ${references}`); }
        emailLines.push(""); emailLines.push(input.body);
        const encoded = btoa(emailLines.join("\r\n")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

        const sendResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ raw: encoded, threadId })
        });

        if (!sendResponse.ok) throw new Error(`Gmail Send Failed: ${await sendResponse.text()}`);
        const data = await sendResponse.json();
        sentEmailId = data.id;
        threadId = data.threadId;

    } else if (connection.provider === "outlook") {
        const message = {
            subject: input.subject,
            body: { contentType: "HTML", content: input.body },
            toRecipients: [{ emailAddress: { address: input.to } }]
        };
        const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ message, saveToSentItems: true })
        });
        if (!res.ok) throw new Error(`Outlook Send Failed: ${await res.text()}`);
    }

    // 5. Store Email
    await supabase.from("emails").insert({
        user_id: userId,
        connection_id: connection.id,
        external_id: sentEmailId || `local-${Date.now()}`,
        thread_id: threadId,
        subject: input.subject,
        from_email: connection.email_address,
        from_name: connection.email_address, // Ideally fetch user name
        to_emails: [{ email: input.to, name: null }],
        body_html: input.body,
        body_text: input.body.replace(/<[^>]*>/g, ""),
        snippet: input.body.substring(0, 100),
        status: "sent",
        is_read: true,
        email_date: new Date().toISOString()
    });

    return { success: true, message: "Email sent successfully", threadId };
}
