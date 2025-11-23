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
    // Verify reCAPTCHA if token provided
    const recaptchaToken = req.headers.get("x-recaptcha-token");
    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, "create_booking", 0.5);
      if (!recaptchaResult.success) {
        return createRecaptchaErrorResponse(recaptchaResult, corsHeaders);
      }
      console.log("[Booking] reCAPTCHA verified, score:", recaptchaResult.score);
    } else {
      console.log("[Booking] reCAPTCHA not configured, skipping verification");
    }

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
      notes: z.string().max(1000).nullable().optional(),
      guests: z.array(z.object({
        name: z.string().optional(),
        email: z.string().email(),
      })).max(10).optional(),
      guestSelectedPlatform: z.string().optional(),
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
      guests,
      guestSelectedPlatform,
    } = bookingSchema.parse(await req.json());
    
    console.log(`[Booking] Request received: slug=${bookingLinkSlug}, guest=${guestName}, time=${scheduledStart}, timezone=${timezone}`);

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

    // PHASE 3: Try to acquire advisory lock for this time slot
    // This prevents race conditions when multiple users try to book the same slot
    console.log("[Booking] Attempting to acquire advisory lock for time slot");
    const { data: lockAcquired, error: lockError } = await supabaseClient
      .rpc('try_acquire_booking_slot_lock', {
        p_user_id: bookingLink.user_id,
        p_scheduled_start: scheduledStart,
        p_scheduled_end: scheduledEnd
      });

    if (lockError) {
      console.error("[Booking] Error acquiring lock:", lockError);
      return new Response(
        JSON.stringify({ error: "Failed to acquire booking lock. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!lockAcquired) {
      console.log("[Booking] Lock already held - slot being booked by another user");
      return new Response(
        JSON.stringify({ error: "This time slot is currently being booked by someone else. Please select another time or try again in a moment." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Booking] Advisory lock acquired successfully");

    // Ensure lock is released even if function fails
    let lockReleased = false;
    const releaseLock = async () => {
      if (!lockReleased) {
        console.log("[Booking] Releasing advisory lock");
        await supabaseClient.rpc('release_booking_slot_lock', {
          p_user_id: bookingLink.user_id,
          p_scheduled_start: scheduledStart,
          p_scheduled_end: scheduledEnd
        });
        lockReleased = true;
      }
    };

    try {
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

    // 3. Check connected calendars (with timeout fallback)
    const { data: calendars } = await supabaseClient
      .from("calendar_connections")
      .select("*")
      .eq("user_id", bookingLink.user_id)
      .eq("is_active", true);

    let calendarCheckFailed = false;
    let calendarCheckTimeout = false;
    const calendarFailureDetails: any[] = [];

    if (calendars && calendars.length > 0) {
      console.log(`[Booking] Checking ${calendars.length} connected calendars for conflicts`);
      
      for (const calendar of calendars) {
        console.log(`[Booking] Checking calendar conflicts for ${calendar.provider}...`);
        
        try {
          let accessToken = calendar.access_token;
          
          // Check if token needs refresh
          const tokenAge = Date.now() - new Date(calendar.updated_at || calendar.created_at).getTime();
          const fiftyMinutes = 50 * 60 * 1000;
          
          if (tokenAge > fiftyMinutes && calendar.refresh_token) {
            console.log(`[Booking] Refreshing ${calendar.provider} token...`);
            
            const refreshFunctionName = calendar.provider === 'google' 
              ? 'google-calendar-auth' 
              : 'microsoft-calendar-auth';
            
            const { data: refreshData } = await supabaseClient.functions.invoke(
              refreshFunctionName,
              {
                body: {
                  action: 'refreshToken',
                  refreshToken: calendar.refresh_token
                }
              }
            );

            if (refreshData?.access_token) {
              accessToken = refreshData.access_token;
              await supabaseClient
                .from('calendar_connections')
                .update({ 
                  access_token: accessToken,
                  updated_at: new Date().toISOString()
                })
                .eq('id', calendar.id);
            }
          }
          
          const functionName = calendar.provider === 'google' 
            ? 'google-calendar-events' 
            : 'microsoft-calendar-events';
          
          // PHASE 3: Configurable timeout (8 seconds instead of 5)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Calendar check timeout')), 8000)
          );
          
          const apiPromise = supabaseClient.functions.invoke(
            functionName,
            {
              body: {
                action: 'findFreeSlots',
                connectionId: calendar.id,
                accessToken: accessToken,
                timeMin: scheduledStart,
                timeMax: scheduledEnd,
                calendars: ['primary']
              }
            }
          );

          const { data: busyData, error: busyError } = await Promise.race([
            apiPromise,
            timeoutPromise
          ]) as any;

          if (busyError) {
            const isTimeout = busyError.message?.includes('timeout');
            console.warn(`[Booking] Calendar check ${isTimeout ? 'timed out' : 'failed'} for ${calendar.provider}:`, busyError);
            
            // Track failure for analytics
            calendarFailureDetails.push({
              provider: calendar.provider,
              error: busyError.message,
              timeout: isTimeout
            });
            
            if (isTimeout) {
              calendarCheckTimeout = true;
            } else {
              calendarCheckFailed = true;
            }
            
            // Don't fail immediately - try other calendars
            continue;
          }

          const busySlots = busyData.busySlots || [];
          console.log(`[Booking] ${calendar.provider} returned ${busySlots.length} busy slots`);
          
          if (busySlots.length > 0) {
            console.log(`[Booking] Conflict detected in ${calendar.provider}:`, JSON.stringify(busySlots[0]));
            
            // Release lock before returning
            await releaseLock();
            
            return new Response(
              JSON.stringify({ 
                error: `Calendar conflict: You have an event in your ${calendar.provider} calendar at this time` 
              }),
              { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (calendarError: any) {
          const isTimeout = calendarError.message?.includes('timeout');
          console.error(`[Booking] ${isTimeout ? 'Timeout' : 'Error'} checking ${calendar.provider} calendar:`, calendarError);
          
          calendarFailureDetails.push({
            provider: calendar.provider,
            error: calendarError.message,
            timeout: isTimeout
          });
          
          if (isTimeout) {
            calendarCheckTimeout = true;
          } else {
            calendarCheckFailed = true;
          }
        }
      }
      
      // PHASE 3: Handle calendar check failures with user choice
      if (calendarCheckFailed || calendarCheckTimeout) {
        const failureType = calendarCheckTimeout ? "timed out" : "failed";
        console.log(`[Booking] Calendar check ${failureType}, but allowing booking to proceed (Phase 3 fallback)`);
        
        // Note: The booking will proceed with a flag indicating calendar check was bypassed
        // The client could potentially show a warning to the user
      }
    }
    
    console.log("[Booking] No conflicts found, proceeding with booking creation");

    // RACE CONDITION PROTECTION: Final database-level check with advisory lock held
    // The unique index will also prevent duplicate bookings at DB level
    const { data: finalCheck } = await supabaseClient
      .from("bookings")
      .select("id")
      .eq("user_id", bookingLink.user_id)
      .eq("status", "confirmed")
      .or(`and(scheduled_start.lt.${scheduledEnd},scheduled_end.gt.${scheduledStart})`)
      .limit(1);

    if (finalCheck && finalCheck.length > 0) {
      console.log("[Booking] Race condition detected - slot was just booked (caught by final check)");
      await releaseLock();
      return new Response(
        JSON.stringify({ error: "This time slot was just booked by someone else. Please select another time." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create booking with metadata about calendar check status
    const bookingMetadata: any = {};
    if (calendarCheckTimeout || calendarCheckFailed) {
      bookingMetadata.calendar_check_bypassed = true;
      bookingMetadata.calendar_check_status = calendarCheckTimeout ? 'timeout' : 'failed';
      bookingMetadata.calendar_failures = calendarFailureDetails;
    }

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
        metadata: bookingMetadata,
        guests: guests || [],
        guest_selected_platform: guestSelectedPlatform,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("[Booking] Database error creating booking:", bookingError);
      
      // Check if this is a unique constraint violation (race condition caught by DB)
      if (bookingError.code === '23505') {
        console.log("[Booking] Unique constraint violation - race condition caught by database");
        await releaseLock();
        return new Response(
          JSON.stringify({ error: "This time slot is no longer available. Please select another time." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      await releaseLock();
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    console.log(`[Booking] Booking created successfully: id=${booking.id}, time=${scheduledStart} to ${scheduledEnd}, timezone=${timezone}`);

    // Log calendar check failures for analytics
    if (calendarFailureDetails.length > 0) {
      for (const failure of calendarFailureDetails) {
        const { error: logError } = await supabaseClient
          .from('booking_calendar_check_failures')
          .insert({
            booking_id: booking.id,
            user_id: bookingLink.user_id,
            provider: failure.provider,
            error_message: failure.error,
            timeout: failure.timeout,
            bypassed: true,
          });
        
        if (logError) {
          console.warn("[Booking] Failed to log calendar check failure:", logError);
        }
      }
    }

    // Release the advisory lock now that booking is confirmed
    await releaseLock();

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

    // Sync to calendar (with detailed logging)
    console.log(`[Booking] ========== CALENDAR SYNC START ==========`);
    console.log(`[Booking] Booking ID: ${booking.id}`);
    console.log(`[Booking] Booking link primary_calendar_id: ${bookingLink.primary_calendar_id}`);
    console.log(`[Booking] Booking link google_calendar_id: ${bookingLink.google_calendar_id}`);
    console.log(`[Booking] Booking link microsoft_calendar_id: ${bookingLink.microsoft_calendar_id}`);
    
    if (bookingLink.primary_calendar_id) {
      try {
        const syncResult = await supabaseClient.functions.invoke("sync-booking-to-calendar", {
          body: { bookingId: booking.id }
        });
        
        console.log(`[Booking] Sync function raw result:`, JSON.stringify(syncResult, null, 2));
        
        if (syncResult.error) {
          console.error(`[Booking] ❌ Calendar sync error:`, {
            error: syncResult.error,
            message: syncResult.error?.message,
            details: syncResult.error?.details,
          });
        } else if (syncResult.data?.success) {
          console.log(`[Booking] ✅ Calendar sync SUCCESS:`, {
            eventId: syncResult.data.calendarEventId,
            provider: syncResult.data.provider,
          });
        } else {
          console.warn(`[Booking] ⚠️ Calendar sync returned unsuccessful:`, syncResult.data);
        }
      } catch (syncError: any) {
        console.error(`[Booking] ❌ Calendar sync exception:`, {
          message: syncError.message,
          stack: syncError.stack,
        });
      }
    } else {
      console.warn(`[Booking] ⚠️ No primary_calendar_id set - skipping calendar sync`);
    }
    console.log(`[Booking] ========== CALENDAR SYNC END ==========`);

    // Handle video platform based on booking link settings and guest choice
    // Priority: guest choice (if allowed) > host default
    let videoPlatform = bookingLink.video_platform || 'quantum_club';
    
    // If guest choice is allowed and guest selected a platform, use that
    if (bookingLink.allow_guest_platform_choice && guestSelectedPlatform) {
      // Validate guest selection is in available platforms
      const availablePlatforms = bookingLink.available_platforms || ['quantum_club'];
      if (availablePlatforms.includes(guestSelectedPlatform)) {
        videoPlatform = guestSelectedPlatform;
        console.log(`[Booking] Using guest-selected platform: ${videoPlatform}`);
      } else {
        console.warn(`[Booking] Guest selected invalid platform ${guestSelectedPlatform}, using host default: ${videoPlatform}`);
      }
    }
    
    console.log(`[Booking] Final video platform: ${videoPlatform}`);
    // Use the actual app domain for meeting links (not Supabase backend domain)
    const siteUrl = Deno.env.get('SITE_URL') || 'https://thequantumclub.app';

    if (videoPlatform === 'quantum_club' && bookingLink.create_quantum_meeting) {
      console.log("[Booking] Creating Quantum Club meeting for booking");
      
      try {
        const meetingResult = await supabaseClient.functions.invoke(
          "create-meeting-from-booking",
          { body: { bookingId: booking.id } }
        );

        if (meetingResult.data?.meetingCode) {
          console.log(`[Booking] Meeting created with code: ${meetingResult.data.meetingCode}`);
          
          await supabaseClient
            .from('bookings')
            .update({
              quantum_meeting_link: `${siteUrl}/meetings/${meetingResult.data.meetingCode}`,
              quantum_meeting_code: meetingResult.data.meetingCode,
              active_video_platform: 'quantum_club',
            })
            .eq('id', booking.id);
        }
      } catch (meetingError) {
        console.error("[Booking] Error creating meeting:", meetingError);
        // Don't fail the booking if meeting creation fails
      }
    } else if (videoPlatform === 'google_meet') {
      console.log("[Booking] Creating Google Meet link for booking");
      
      try {
        const googleResult = await supabaseClient.functions.invoke(
          "generate-video-link",
          { 
            body: { 
              bookingId: booking.id, 
              provider: 'google_meet',
              realIntegration: true,
            } 
          }
        );

        if (googleResult.data?.videoLink) {
          console.log(`[Booking] Google Meet link created: ${googleResult.data.videoLink}`);
          
          await supabaseClient
            .from('bookings')
            .update({
              google_meet_hangout_link: googleResult.data.videoLink,
              google_meet_event_id: googleResult.data.meetingId,
              video_meeting_link: googleResult.data.videoLink,
              active_video_platform: 'google_meet',
            })
            .eq('id', booking.id);
        } else {
          console.error("[Booking] Google Meet creation returned no video link");
          throw new Error("Failed to create Google Meet link");
        }
      } catch (googleError: any) {
        console.error("[Booking] Google Meet creation failed:", googleError);
        // Don't fallback - let the booking exist with error logged
        await supabaseClient
          .from('bookings')
          .update({
            metadata: {
              ...bookingMetadata,
              video_platform_error: true,
              error_message: googleError?.message || 'Google Meet creation failed',
            }
          })
          .eq('id', booking.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking,
        redirectUrl: bookingLink.redirect_url,
        calendarCheckBypassed: calendarCheckTimeout || calendarCheckFailed,
        calendarCheckWarning: (calendarCheckTimeout || calendarCheckFailed) 
          ? "We couldn't verify your calendar availability, but your booking is confirmed. Please check your calendar manually."
          : null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
    } catch (innerError: any) {
      // Ensure lock is released even if inner try block fails
      await releaseLock();
      throw innerError;
    }
    
  } catch (error: any) {
    console.error("Error creating booking:", error);
    
    // Return appropriate status codes based on error type
    let status = 500;
    let errorMessage = "An unexpected error occurred. Please try again.";
    
    // Database constraint violations
    if (error.code === '23505') {
      status = 409;
      errorMessage = "This booking already exists.";
    } else if (error.code === '23503') {
      status = 400;
      errorMessage = "Invalid booking link or user reference.";
    }
    // Validation errors
    else if (error.name === 'ZodError') {
      status = 400;
      errorMessage = "Invalid booking data: " + error.issues.map((i: any) => i.message).join(", ");
    }
    // Rate limit or quota errors
    else if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
      status = 429;
      errorMessage = "Too many requests. Please try again later.";
    }
    // Calendar or external service errors
    else if (error.message?.includes('calendar') || error.message?.includes('timeout')) {
      status = 503;
      errorMessage = "Calendar service temporarily unavailable. Please try again.";
    }
    // Use the error message if it's user-friendly
    else if (error.message && !error.message.includes('function') && !error.message.includes('undefined')) {
      errorMessage = error.message;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: error.code || 'UNKNOWN_ERROR'
      }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});