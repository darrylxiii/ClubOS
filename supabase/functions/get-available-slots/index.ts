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
    const { bookingLinkSlug, dateRange, timezone = "UTC" } = await req.json();

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

    // Get user's scheduling preferences
    const { data: preferences } = await supabaseClient
      .from("task_scheduling_preferences")
      .select("*")
      .eq("user_id", bookingLink.user_id)
      .single();

    // Get existing bookings
    const { data: existingBookings } = await supabaseClient
      .from("bookings")
      .select("scheduled_start, scheduled_end")
      .eq("user_id", bookingLink.user_id)
      .gte("scheduled_start", dateRange.start)
      .lte("scheduled_end", dateRange.end)
      .eq("status", "confirmed");

    // Generate available slots
    const slots = generateAvailableSlots(
      dateRange,
      bookingLink,
      preferences,
      existingBookings || [],
      timezone
    );

    return new Response(
      JSON.stringify({ slots }),
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
  preferences: any,
  existingBookings: any[],
  timezone: string
): any[] {
  const slots = [];
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  
  const workingHoursStart = preferences?.working_hours_start || "09:00:00";
  const workingHoursEnd = preferences?.working_hours_end || "17:00:00";
  const workingDays = preferences?.working_days || [1, 2, 3, 4, 5];
  
  const durationMinutes = bookingLink.duration_minutes;
  const bufferBefore = bookingLink.buffer_before_minutes || 0;
  const bufferAfter = bookingLink.buffer_after_minutes || 0;
  const minNoticeHours = bookingLink.min_notice_hours || 2;
  
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
          slots.push({
            start: slotTime.toISOString(),
            end: slotEnd.toISOString(),
          });
        }
      }
      
      // Move to next slot (30 min intervals)
      slotTime = new Date(slotTime.getTime() + 30 * 60 * 1000);
    }
  }
  
  return slots;
}