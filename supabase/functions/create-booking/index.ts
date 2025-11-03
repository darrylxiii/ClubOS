import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { verifyRecaptcha, createRecaptchaErrorResponse } from "../_shared/recaptcha-verifier.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-recaptcha-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify reCAPTCHA
    const recaptchaToken = req.headers.get("x-recaptcha-token");
    if (!recaptchaToken) {
      return new Response(
        JSON.stringify({ error: "reCAPTCHA verification required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recaptchaResult = await verifyRecaptcha(recaptchaToken, "create_booking", 0.5);
    if (!recaptchaResult.success) {
      return createRecaptchaErrorResponse(recaptchaResult, corsHeaders);
    }

    console.log("[Booking] reCAPTCHA verified, score:", recaptchaResult.score);

    // Validate input
    const bookingSchema = z.object({
      bookingLinkSlug: z.string().min(1).max(100),
      guestName: z.string().min(1).max(200),
      guestEmail: z.string().email().max(255),
      guestPhone: z.string().max(50).nullable().optional(),
      scheduledStart: z.string().datetime(),
      scheduledEnd: z.string().datetime(),
      timezone: z.string().min(1).max(100),
      customResponses: z.record(z.any()).optional(),
      notes: z.string().max(1000).nullable().optional()
    });

    const {
      bookingLinkSlug,
      guestName,
      guestEmail,
      guestPhone,
      scheduledStart,
      scheduledEnd,
      timezone,
      customResponses,
      notes,
    } = bookingSchema.parse(await req.json());

    // Use service role to bypass RLS for secure booking creation
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // IP-based rate limiting: 5 bookings per 15 minutes per IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const { data: recentBookings, error: rateLimitError } = await supabaseClient
      .from("bookings")
      .select("id")
      .eq("guest_email", guestEmail)
      .gte("created_at", fifteenMinutesAgo);

    if (!rateLimitError && recentBookings && recentBookings.length >= 5) {
      console.log("[Booking] Rate limit exceeded for:", guestEmail);
      return new Response(
        JSON.stringify({ 
          error: "Too many booking attempts. Please try again in a few minutes.",
          retryAfter: 900
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "900"
          } 
        }
      );
    }

    // Get booking link details
    const { data: bookingLink, error: linkError } = await supabaseClient
      .from("booking_links")
      .select("*")
      .eq("slug", bookingLinkSlug)
      .eq("is_active", true)
      .single();

    if (linkError || !bookingLink) {
      return new Response(
        JSON.stringify({ error: "Booking link not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Comprehensive conflict checking
    console.log("[Booking] Creating booking for:", { 
      slug: bookingLinkSlug, 
      time: scheduledStart, 
      guest: guestName,
      userId: bookingLink.user_id 
    });
    
    // 1. Check existing bookings
    const { data: existingBookings } = await supabaseClient
      .from("bookings")
      .select("id, guest_name")
      .eq("user_id", bookingLink.user_id)
      .eq("status", "confirmed")
      .or(`and(scheduled_start.lt.${scheduledEnd},scheduled_end.gt.${scheduledStart})`);

    if (existingBookings && existingBookings.length > 0) {
      console.log("[Booking] Conflict: Existing booking found");
      return new Response(
        JSON.stringify({ error: "This time slot is no longer available - already booked" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check Quantum Club meetings (using correct column names)
    const { data: meetings } = await supabaseClient
      .from("meetings")
      .select("id, title")
      .eq("host_id", bookingLink.user_id)
      .or(`and(scheduled_start.lt.${scheduledEnd},scheduled_end.gt.${scheduledStart})`);

    if (meetings && meetings.length > 0) {
      console.log("[Booking] Conflict: Quantum Club meeting found:", meetings[0].title);
      return new Response(
        JSON.stringify({ error: "Calendar conflict: You have a meeting at this time" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check connected calendars
    const { data: calendars } = await supabaseClient
      .from("calendar_connections")
      .select("*")
      .eq("user_id", bookingLink.user_id)
      .eq("is_active", true);

    if (calendars && calendars.length > 0) {
      for (const calendar of calendars) {
        try {
          const functionName = calendar.provider === 'google' 
            ? 'google-calendar-events' 
            : 'microsoft-calendar-events';
          
          const { data: busyData, error: busyError } = await supabaseClient.functions.invoke(
            functionName,
            {
              body: {
                action: 'findFreeSlots',
                connectionId: calendar.id,
                timeMin: scheduledStart,
                timeMax: scheduledEnd,
                calendars: ['primary']
              }
            }
          );

          if (!busyError && busyData?.busySlots && busyData.busySlots.length > 0) {
            console.log("[Booking] Conflict: Calendar busy time found in", calendar.provider);
            return new Response(
              JSON.stringify({ 
                error: `Calendar conflict: You have an event in your ${calendar.provider} calendar at this time` 
              }),
              { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (calendarError) {
          console.error(`[Booking] Error checking ${calendar.provider} calendar:`, calendarError);
          // Continue with booking - don't fail on calendar check errors
        }
      }
    }
    
    console.log("[Booking] Conflict check results:", {
      existingBookings: existingBookings?.length || 0,
      meetings: meetings?.length || 0,
      calendars: calendars?.length || 0
    });
    console.log("[Booking] No conflicts found, proceeding with booking creation");

    // RACE CONDITION PROTECTION: Double-check no conflicts before creating
    const { data: finalCheck } = await supabaseClient
      .from("bookings")
      .select("id")
      .eq("user_id", bookingLink.user_id)
      .eq("status", "confirmed")
      .or(`and(scheduled_start.lt.${scheduledEnd},scheduled_end.gt.${scheduledStart})`)
      .limit(1);

    if (finalCheck && finalCheck.length > 0) {
      console.log("[Booking] Race condition detected - slot was just booked");
      return new Response(
        JSON.stringify({ error: "This time slot was just booked by someone else. Please select another time." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .insert({
        booking_link_id: bookingLink.id,
        user_id: bookingLink.user_id,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        timezone: timezone,
        custom_responses: customResponses || {},
        notes: notes,
        status: "confirmed",
      })
      .select()
      .single();

    if (bookingError) {
      throw bookingError;
    }

    // Send confirmation email
    try {
      await supabaseClient.functions.invoke("send-booking-confirmation", {
        body: {
          booking: booking,
          bookingLink: bookingLink,
        },
      });
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
    }

    // Sync to calendar (don't wait for it)
    supabaseClient.functions.invoke("sync-booking-to-calendar", {
      body: { bookingId: booking.id }
    }).catch(err => console.error("Error syncing to calendar:", err));

    // Create Quantum Club meeting (don't wait for it)
    supabaseClient.functions.invoke("create-meeting-from-booking", {
      body: { bookingId: booking.id }
    }).catch(err => console.error("Error creating meeting:", err));

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking,
        redirectUrl: bookingLink.redirect_url 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating booking:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});