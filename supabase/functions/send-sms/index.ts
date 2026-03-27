import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { sendSMS } from '../_shared/twilio-client.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      to, 
      message, 
      candidate_id, 
      prospect_id, 
      company_id 
    } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!to || !message) {
      throw new Error("'to' and 'message' are required");
    }

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

    // Create pending SMS record
    const { data: smsRecord, error: insertError } = await supabase
      .from("sms_messages")
      .insert({
        phone_number: to,
        direction: "outbound",
        content: message,
        status: "pending",
        candidate_id,
        prospect_id,
        company_id,
        owner_id: userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create SMS record:", insertError);
      throw insertError;
    }

    // Send via Twilio (shared client handles auth, timeout, retry)
    try {
      const twilioResult = await sendSMS({ to, body: message });

      // Update record with Twilio SID and sent status
      await supabase
        .from("sms_messages")
        .update({
          twilio_sid: twilioResult.sid,
          status: "sent",
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", smsRecord.id);

      console.log("SMS sent successfully:", twilioResult.sid);

      return new Response(
        JSON.stringify({
          success: true,
          sms_id: smsRecord.id,
          twilio_sid: twilioResult.sid,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (smsError) {
      console.error("Twilio error:", smsError);

      // Update record as failed
      await supabase
        .from("sms_messages")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", smsRecord.id);

      throw new Error(smsError instanceof Error ? smsError.message : "Failed to send SMS");
    }
  } catch (error) {
    console.error("send-sms error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
