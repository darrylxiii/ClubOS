import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkUserRateLimit, createRateLimitResponse } from "../_shared/rate-limiter.ts";
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 10 requests per 15 minutes per IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    const rateLimit = await checkUserRateLimit(clientIp, 'join-waitlist', 10, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      console.warn('[Waitlist] Rate limit exceeded for IP:', clientIp);
      return createRateLimitResponse(rateLimit.retryAfter!, corsHeaders);
    }
    const schema = z.object({
      bookingLinkId: z.string().uuid(),
      guestName: z.string().min(1).max(200),
      guestEmail: z.string().email().max(255),
      guestPhone: z.string().max(50).nullable().optional(),
      preferredDates: z.array(z.string()).optional(),
      preferredTimeRange: z.enum(['morning', 'afternoon', 'evening']).optional(),
      notes: z.string().max(500).nullable().optional(),
    });

    const body = schema.parse(await req.json());
    console.log('[Waitlist] Join request:', body.guestEmail, 'for link:', body.bookingLinkId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify booking link exists and allows waitlist
    const { data: bookingLink, error: linkError } = await supabase
      .from("booking_links")
      .select("id, title, allow_waitlist")
      .eq("id", body.bookingLinkId)
      .single();

    if (linkError || !bookingLink) {
      console.error('[Waitlist] Booking link not found:', body.bookingLinkId);
      return new Response(
        JSON.stringify({ error: "Booking link not found or doesn't allow waitlist" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!bookingLink.allow_waitlist) {
      return new Response(
        JSON.stringify({ error: "Waitlist not enabled for this booking link" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already on waitlist
    const { data: existing } = await supabase
      .from("booking_waitlist")
      .select("id")
      .eq("booking_link_id", body.bookingLinkId)
      .eq("guest_email", body.guestEmail)
      .eq("notified", false)
      .maybeSingle();

    if (existing) {
      console.log('[Waitlist] Already on waitlist:', body.guestEmail);
      return new Response(
        JSON.stringify({ message: "Already on waitlist", id: existing.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add to waitlist
    const { data: waitlistEntry, error } = await supabase
      .from("booking_waitlist")
      .insert({
        booking_link_id: body.bookingLinkId,
        guest_name: body.guestName,
        guest_email: body.guestEmail,
        guest_phone: body.guestPhone || null,
        preferred_dates: body.preferredDates || [],
        preferred_time_range: body.preferredTimeRange || null,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Waitlist] Insert error:', error);
      throw error;
    }

    console.log('[Waitlist] Successfully added:', waitlistEntry.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: waitlistEntry.id,
        message: "Successfully joined waitlist. We'll notify you when a spot opens up."
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[Waitlist] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
