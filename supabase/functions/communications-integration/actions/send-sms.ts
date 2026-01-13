import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const SendSmsSchema = z.object({
    to: z.string(),
    message: z.string(),
    candidate_id: z.string().optional(),
    prospect_id: z.string().optional(),
    company_id: z.string().optional(),
});

interface ActionContext {
    supabase: SupabaseClient;
    payload: any;
    userId: string | null;
}

export async function handleSendSms({ supabase, payload, userId }: ActionContext) {
    const input = SendSmsSchema.parse(payload);
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
        throw new Error("Twilio credentials not configured");
    }

    // 1. Log Pending
    const { data: smsRecord, error: insertError } = await supabase
        .from("sms_messages")
        .insert({
            phone_number: input.to,
            direction: "outbound",
            content: input.message,
            status: "pending",
            candidate_id: input.candidate_id,
            prospect_id: input.prospect_id,
            company_id: input.company_id,
            owner_id: userId,
        })
        .select()
        .single();

    if (insertError) throw insertError;

    // 2. Send via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const formData = new URLSearchParams();
    formData.append("To", input.to);
    formData.append("From", TWILIO_PHONE_NUMBER);
    formData.append("Body", input.message);

    const twilioResponse = await fetch(twilioUrl, {
        method: "POST",
        headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
        await supabase.from("sms_messages").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", smsRecord.id);
        throw new Error(twilioData.message || "Failed to send SMS");
    }

    // 3. Update Success
    await supabase.from("sms_messages").update({
        twilio_sid: twilioData.sid,
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }).eq("id", smsRecord.id);

    return { success: true, sms_id: smsRecord.id, twilio_sid: twilioData.sid };
}
