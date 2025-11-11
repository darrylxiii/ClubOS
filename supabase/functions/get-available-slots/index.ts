import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingLinkSlug, dateRange, timezone = "Europe/Amsterdam" } = await req.json();
    console.log(`[Slots] Request params: slug=${bookingLinkSlug}, dateRange=${JSON.stringify(dateRange)}, timezone=${timezone}`);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get booking link details
    const { data: bookingLink, error: linkError } = await supabaseClient
      .from("booking_links")
      .select("*, user_id")
      .eq("slug", bookingLinkSlug)
      .eq("is_active", true)
      .single();

    if (linkError || !bookingLink) {
      return new Response(
        JSON.stringify({ error: "Booking link not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's booking availability settings
    const { data: settings } = await supabaseClient
      .from("booking_availability_settings")
      .select("*")
      .eq("user_id", bookingLink.user_id)
      .single();

    // Get existing bookings from database
    const { data: existingBookings } = await supabaseClient
      .from("bookings")
      .select("scheduled_start, scheduled_end")
      .eq("user_id", bookingLink.user_id)
      .gte("scheduled_start", dateRange.start)
      .lte("scheduled_end", dateRange.end)
      .eq("status", "confirmed");

    // Get Quantum Club meetings to block slots (using correct column names)
    const { data: meetings } = await supabaseClient
      .from("meetings")
      .select("scheduled_start, scheduled_end")
      .eq("host_id", bookingLink.user_id)
      .gte("scheduled_start", dateRange.start)
      .lte("scheduled_end", dateRange.end);

    console.log(`[Slots] Found ${meetings?.length || 0} Quantum Club meetings`);

    // Convert meetings to booking format
    const meetingBlockedTimes = (meetings || []).map(m => ({
      scheduled_start: m.scheduled_start,
      scheduled_end: m.scheduled_end
    }));

    // Get connected calendars and fetch busy times
    const { data: calendars } = await supabaseClient
      .from("calendar_connections")
      .select("*")
      .eq("user_id", bookingLink.user_id)
      .eq("is_active", true);

    const calendarBusyTimes: any[] = [];

    // Fetch busy times from each connected calendar
    if (calendars && calendars.length > 0) {
      console.log(`[Slots] Checking ${calendars.length} connected calendars`);
      
      for (const calendar of calendars) {
        try {
          let accessToken = calendar.access_token;
          let tokenRefreshed = false;
          
          // Check if token might be expired (older than 50 minutes)
          const tokenAge = Date.now() - new Date(calendar.updated_at || calendar.created_at).getTime();
          const fiftyMinutes = 50 * 60 * 1000;
          
          if (tokenAge > fiftyMinutes && calendar.refresh_token) {
            console.log(`[Slots] Token might be expired (age: ${Math.round(tokenAge / 60000)}min), attempting refresh...`);
            
            try {
              // Attempt token refresh
              const refreshFunctionName = calendar.provider === 'google' 
                ? 'google-calendar-auth' 
                : 'microsoft-calendar-auth';
              
              const { data: refreshData, error: refreshError } = await supabaseClient.functions.invoke(
                refreshFunctionName,
                {
                  body: {
                    action: 'refreshToken',
                    refreshToken: calendar.refresh_token
                  }
                }
              );

              if (!refreshError && refreshData?.access_token) {
                accessToken = refreshData.access_token;
                tokenRefreshed = true;
                
                // Update the stored token
                await supabaseClient
                  .from('calendar_connections')
                  .update({ 
                    access_token: accessToken,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', calendar.id);
                
                console.log(`[Slots] Token refreshed successfully for ${calendar.provider}`);
              } else {
                console.warn(`[Slots] Token refresh failed, using existing token:`, refreshError);
              }
            } catch (refreshError) {
              console.warn(`[Slots] Token refresh error, using existing token:`, refreshError);
            }
          }
          
          const functionName = calendar.provider === 'google' 
            ? 'google-calendar-events' 
            : 'microsoft-calendar-events';
          
          // Set timeout for calendar API call (5 seconds max)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Calendar API timeout')), 5000)
          );
          
          const apiPromise = supabaseClient.functions.invoke(
            functionName,
            {
              body: {
                action: 'findFreeSlots',
                connectionId: calendar.id,
                accessToken: accessToken,
                timeMin: dateRange.start,
                timeMax: dateRange.end,
                calendars: ['primary']
              }
            }
          );

          const { data: busyData, error: busyError } = await Promise.race([
            apiPromise,
            timeoutPromise
          ]) as any;

          if (!busyError && busyData?.busySlots) {
            console.log(`[Slots] ${calendar.provider} returned ${busyData.busySlots.length} busy slots${tokenRefreshed ? ' (token refreshed)' : ''}`);
            if (busyData.busySlots.length > 0) {
              console.log(`[Slots] Sample busy slot from ${calendar.provider}:`, JSON.stringify(busyData.busySlots[0]));
            }
            calendarBusyTimes.push(...busyData.busySlots.map((slot: any) => ({
              scheduled_start: slot.start,
              scheduled_end: slot.end
            })));
          } else if (busyError) {
            console.error(`[Slots] Calendar API error for ${calendar.provider}:`, busyError);
            console.error(`[Slots] Calendar API call failed - connectionId: ${calendar.id}, timeMin: ${dateRange.start}, timeMax: ${dateRange.end}`);
            // Don't fail the entire request, continue with other calendars
          } else {
            console.log(`[Slots] ${calendar.provider} returned no busy slots or unexpected format:`, JSON.stringify(busyData));
          }
        } catch (error) {
          console.error(`[Slots] Error fetching calendar busy times from ${calendar.provider}:`, error);
          // Continue with other calendars even if one fails
        }
      }
    }

    // Merge all busy times: bookings + calendar + meetings
    const allBusyTimes = [
      ...(existingBookings || []), 
      ...calendarBusyTimes,
      ...meetingBlockedTimes
    ];
    console.log(`[Slots] Total busy times: ${allBusyTimes.length} (${existingBookings?.length || 0} bookings + ${calendarBusyTimes.length} calendar + ${meetingBlockedTimes.length} meetings)`);
    
    if (allBusyTimes.length > 0) {
      console.log(`[Slots] First 3 busy times:`, JSON.stringify(allBusyTimes.slice(0, 3)));
    }

    // Generate available slots
    const slots = generateAvailableSlots(
      dateRange,
      bookingLink,
      settings,
      allBusyTimes,
      timezone
    );

    console.log(`[Slots] Generated ${slots.length} available slots`);

    // Validate format before returning
    const validatedSlots = slots.filter(slot => {
      if (typeof slot !== 'string') {
        console.error('[Slots] Invalid slot format (not a string):', slot);
        return false;
      }
      if (!slot.includes(' - ')) {
        console.error('[Slots] Invalid slot format (missing separator):', slot);
        return false;
      }
      return true;
    });

    console.log(`[Slots] Validated ${validatedSlots.length} slots`);
    if (validatedSlots.length > 0) {
      console.log(`[Slots] Sample validated slot:`, validatedSlots[0]);
    }

    // Generate availability summary for frontend optimization
    const slotsByDate = new Map<string, number>();
    validatedSlots.forEach(slot => {
      const [_, dateStr] = slot.split(" - ");
      slotsByDate.set(dateStr, (slotsByDate.get(dateStr) || 0) + 1);
    });

    const availabilitySummary = Array.from(slotsByDate.entries()).map(([date, count]) => ({
      date,
      count,
      status: count >= 10 ? 'many' : count >= 4 ? 'few' : count >= 1 ? 'limited' : 'none'
    }));

    console.log(`[Slots] Availability summary:`, availabilitySummary);

    return new Response(
      JSON.stringify({ 
        slots: validatedSlots,
        availabilitySummary
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error getting available slots:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateAvailableSlots(
  dateRange: any,
  bookingLink: any,
  settings: any,
  existingBookings: any[],
  timezone: string
): any[] {
  const slots = [];
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  
  // Use settings from booking_availability_settings table or defaults
  const workingHoursStart = settings?.default_start_time || "09:00:00";
  const workingHoursEnd = settings?.default_end_time || "17:00:00";
  const workingDays = settings?.default_available_days || [1, 2, 3, 4, 5];
  
  console.log(`[Slots] Using availability settings: start=${workingHoursStart}, end=${workingHoursEnd}, days=${JSON.stringify(workingDays)}`);
  
  const durationMinutes = bookingLink.duration_minutes;
  const bufferBefore = bookingLink.buffer_before_minutes || 0;
  const bufferAfter = bookingLink.buffer_after_minutes || 0;
  const minNoticeHours = bookingLink.min_notice_hours || 2;
  
  console.log(`[Slots] Slot generation params: duration=${durationMinutes}min, buffer_before=${bufferBefore}min, buffer_after=${bufferAfter}min`);
  
  const now = new Date();
  const minStartTime = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    
    // Skip non-working days
    if (!workingDays.includes(dayOfWeek)) continue;
    
    const [startHour, startMinute] = workingHoursStart.split(":").map(Number);
    const [endHour, endMinute] = workingHoursEnd.split(":").map(Number);
    
    let slotTime = new Date(d);
    slotTime.setHours(startHour, startMinute, 0, 0);
    
    const dayEnd = new Date(d);
    dayEnd.setHours(endHour, endMinute, 0, 0);
    
    while (slotTime < dayEnd) {
      const slotEnd = new Date(slotTime.getTime() + durationMinutes * 60 * 1000);
      
      // Check if slot is in the future with minimum notice
      if (slotTime >= minStartTime && slotEnd <= dayEnd) {
        // Check for conflicts with existing bookings
        const hasConflict = existingBookings.some((booking) => {
          const bookingStart = new Date(booking.scheduled_start);
          const bookingEnd = new Date(booking.scheduled_end);
          
          const slotStartWithBuffer = new Date(slotTime.getTime() - bufferBefore * 60 * 1000);
          const slotEndWithBuffer = new Date(slotEnd.getTime() + bufferAfter * 60 * 1000);
          
          return (
            (slotStartWithBuffer < bookingEnd && slotEndWithBuffer > bookingStart)
          );
        });
        
        if (!hasConflict) {
          // Format: "HH:MM - YYYY-MM-DD" for frontend consumption
          const timeStr = slotTime.toTimeString().slice(0, 5); // "09:00"
          const dateStr = slotTime.toISOString().split('T')[0]; // "2025-11-13"
          slots.push(`${timeStr} - ${dateStr}`);
        }
      }
      
      // Move to next slot using the booking duration or 30min, whichever is smaller
      // This ensures slots don't overlap and match the actual booking length
      const slotInterval = Math.min(durationMinutes, 30);
      slotTime = new Date(slotTime.getTime() + slotInterval * 60 * 1000);
    }
  }
  
  return slots;
}