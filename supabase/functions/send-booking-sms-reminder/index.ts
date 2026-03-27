import { createHandler } from '../_shared/handler.ts';
import { sendSMS } from '../_shared/twilio-client.ts';

interface SMSReminderRequest {
  bookingId: string;
}

Deno.serve(createHandler(async (req, ctx) => {
    const supabase = ctx.supabase;
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
        { status: 404, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if guest opted into SMS reminders
    if (!booking.sms_reminders) {
      console.log("Guest did not opt into SMS reminders");
      return new Response(
        JSON.stringify({ message: "SMS reminders not enabled for this booking" }),
        { status: 200, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if guest phone number exists
    if (!booking.guest_phone) {
      console.log("No phone number on file for guest");
      return new Response(
        JSON.stringify({ error: "No phone number on file" }),
        { status: 400, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
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
      `Manage your booking: ${Deno.env.get("APP_URL") || "https://os.thequantumclub.com"}/bookings/${booking.id}`;

    console.log(`Sending SMS to ${booking.guest_phone}`);

    // Send SMS via Twilio (shared client handles auth, timeout, retry)
    const twilioResult = await sendSMS({ to: booking.guest_phone, body: smsBody });
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
      { status: 200, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
    );
}));
