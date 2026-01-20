import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error("Twilio credentials not configured");
    }

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

    // Send via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams();
    formData.append("To", to);
    formData.append("From", TWILIO_PHONE_NUMBER);
    formData.append("Body", message);

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
      console.error("Twilio error:", twilioData);
      
      // Update record as failed
      await supabase
        .from("sms_messages")
        .update({ 
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", smsRecord.id);

      throw new Error(twilioData.message || "Failed to send SMS");
    }

    // Update record with Twilio SID and sent status
    await supabase
      .from("sms_messages")
      .update({
        twilio_sid: twilioData.sid,
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", smsRecord.id);

    console.log("SMS sent successfully:", twilioData.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sms_id: smsRecord.id,
        twilio_sid: twilioData.sid,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-sms error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
