import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSReminderRequest {
  bookingId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error("Twilio credentials not configured");
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { bookingId }: SMSReminderRequest = await req.json();

    console.log(`Processing SMS reminder for booking: ${bookingId}`);

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        booking_links (title, duration_minutes),
        profiles:user_id (full_name, phone)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found:", bookingError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if guest opted into SMS reminders
    if (!booking.sms_reminders) {
      console.log("Guest did not opt into SMS reminders");
      return new Response(
        JSON.stringify({ message: "SMS reminders not enabled for this booking" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if guest phone number exists
    if (!booking.guest_phone) {
      console.log("No phone number on file for guest");
      return new Response(
        JSON.stringify({ error: "No phone number on file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format the scheduled time
    const scheduledDate = new Date(booking.scheduled_start);
    const formattedDate = scheduledDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Compose SMS message
    const hostName = booking.profiles?.full_name || "your host";
    const meetingTitle = booking.booking_links?.title || "meeting";
    
    const smsBody = `Reminder: Your ${meetingTitle} with ${hostName} is scheduled for ${formattedDate} at ${formattedTime}. ` +
      `Manage your booking: ${Deno.env.get("APP_URL") || "https://thequantumclub.com"}/bookings/${booking.id}`;

    console.log(`Sending SMS to ${booking.guest_phone}`);

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", booking.guest_phone);
    formData.append("From", twilioPhoneNumber);
    formData.append("Body", smsBody);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json();
      console.error("Twilio API error:", errorData);
      throw new Error(`Twilio error: ${errorData.message || twilioResponse.statusText}`);
    }

    const twilioResult = await twilioResponse.json();
    console.log("SMS sent successfully:", twilioResult.sid);

    // Log the SMS reminder in the database
    await supabase
      .from("booking_reminder_logs")
      .insert({
        booking_id: bookingId,
        reminder_type: "sms",
        sent_at: new Date().toISOString(),
        status: "sent",
        metadata: {
          twilio_sid: twilioResult.sid,
          phone: booking.guest_phone,
        },
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "SMS reminder sent",
        sid: twilioResult.sid 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending SMS reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send SMS reminder" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
