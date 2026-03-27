import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { verifyTwilioWebhook } from '../_shared/webhook-verifier.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse Twilio webhook payload (form-urlencoded)
    const formData = await req.formData();
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    // Verify Twilio signature
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioSignature = req.headers.get('X-Twilio-Signature');
    if (twilioAuthToken && twilioSignature) {
      const requestUrl = new URL(req.url).toString();
      const isValid = await verifyTwilioWebhook(requestUrl, payload, twilioSignature, twilioAuthToken);
      if (!isValid) {
        console.error('[Twilio SMS Webhook] Signature verification failed');
        return new Response('Invalid signature', { status: 403 });
      }
      console.log('[Twilio SMS Webhook] Signature verified');
    } else if (Deno.env.get('DENO_ENV') !== 'development') {
      console.warn('[Twilio SMS Webhook] Signature verification skipped — missing TWILIO_AUTH_TOKEN or X-Twilio-Signature');
    }

    console.log("Twilio SMS webhook received:", JSON.stringify(payload, null, 2));

    const {
      MessageSid,
      From,
      To,
      Body,
      NumMedia,
      FromCity,
      FromState,
      FromCountry,
    } = payload;

    if (!From || !Body) {
      console.error("Missing required fields: From or Body");
      return new Response("Missing required fields", { status: 400 });
    }

    // Normalize phone number (remove + if present for matching)
    const normalizedPhone = From.replace(/^\+/, "");

    // Try to match to candidate, prospect, or company
    let candidateId: string | null = null;
    let prospectId: string | null = null;
    let companyId: string | null = null;
    let ownerId: string | null = null;

    // Check candidate_profiles
    const { data: candidate } = await supabase
      .from("candidate_profiles")
      .select("id, phone, strategist_id")
      .or(`phone.eq.${From},phone.eq.${normalizedPhone},phone.ilike.%${normalizedPhone.slice(-10)}%`)
      .limit(1)
      .maybeSingle();

    if (candidate) {
      candidateId = candidate.id;
      ownerId = candidate.strategist_id;
    }

    // Check profiles if no candidate match
    if (!candidateId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, phone")
        .or(`phone.eq.${From},phone.eq.${normalizedPhone}`)
        .limit(1)
        .maybeSingle();

      if (profile) {
        // This is a registered user sending SMS
        ownerId = profile.id;
      }
    }

    // Check CRM prospects
    if (!candidateId) {
      const { data: prospect } = await supabase
        .from("crm_prospects")
        .select("id, phone, company_id, owner_id")
        .or(`phone.eq.${From},phone.eq.${normalizedPhone}`)
        .limit(1)
        .maybeSingle();

      if (prospect) {
        prospectId = prospect.id;
        companyId = prospect.company_id;
        ownerId = prospect.owner_id;
      }
    }

    // Insert SMS message
    const { data: smsMessage, error: insertError } = await supabase
      .from("sms_messages")
      .insert({
        phone_number: From,
        direction: "inbound",
        content: Body,
        status: "received",
        twilio_sid: MessageSid,
        candidate_id: candidateId,
        prospect_id: prospectId,
        company_id: companyId,
        owner_id: ownerId,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert SMS:", insertError);
      throw insertError;
    }

    console.log("SMS message inserted:", smsMessage.id);

    // Queue for sentiment analysis
    await supabase.functions.invoke("analyze-sentiment", {
      body: {
        text: Body,
        entity_type: "sms",
        entity_id: smsMessage.id,
      }
    }).catch(err => console.error("Sentiment analysis failed:", err));

    // Create notification for owner
    if (ownerId) {
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: ownerId,
        title: "New SMS Received",
        message: `SMS from ${From}: "${Body.substring(0, 100)}${Body.length > 100 ? '...' : ''}"`,
        notification_type: "sms_received",
        priority: "medium",
        metadata: {
          sms_id: smsMessage.id,
          from_number: From,
          candidate_id: candidateId,
          prospect_id: prospectId,
        }
      });
      if (notifError) console.error("Notification creation failed:", notifError);
    }

    // Return TwiML response (empty to not send auto-reply)
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;

    return new Response(twimlResponse, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/xml" 
      },
    });
  } catch (error) {
    console.error("twilio-sms-webhook error:", error);
    
    // Return valid TwiML even on error
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;
    
    return new Response(errorTwiml, {
      status: 200, // Twilio expects 200 even on our errors
      headers: { ...corsHeaders, "Content-Type": "application/xml" },
    });
  }
});
