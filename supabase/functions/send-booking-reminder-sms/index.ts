import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, name, booking } = await req.json();

    // Note: SMS functionality requires Twilio integration
    // For now, we'll log and return success
    // To implement: Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER secrets
    
    const startDate = new Date(booking.scheduled_start);
    const now = new Date();
    const hoursUntil = Math.round((startDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    let message = `Hi ${name}, reminder: You have a meeting `;
    if (hoursUntil >= 20) {
      message += "tomorrow";
    } else if (hoursUntil >= 1) {
      message += `in ${hoursUntil} hours`;
    } else {
      const minutesUntil = Math.round((startDate.getTime() - now.getTime()) / (1000 * 60));
      message += `in ${minutesUntil} minutes`;
    }
    
    if (booking.quantum_meeting_link) {
      message += `. Join: ${booking.quantum_meeting_link}`;
    }

    console.log(`[SMS] Would send to ${phone}: ${message}`);
    
    // TODO: Implement Twilio SMS sending
    // const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    // const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    // const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");
    
    // if (!twilioAccountSid || !twilioAuthToken || !twilioPhone) {
    //   console.warn("[SMS] Twilio credentials not configured");
    //   return new Response(
    //     JSON.stringify({ success: false, message: "SMS not configured" }),
    //     { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    //   );
    // }

    return new Response(
      JSON.stringify({ success: true, message: "SMS functionality not yet configured" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending SMS reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
