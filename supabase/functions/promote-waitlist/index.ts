import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Button, Card, Heading, Paragraph, Spacer } from "../_shared/email-templates/components.ts";
import { checkUserRateLimit, createRateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 20 requests per 15 minutes per IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    const rateLimit = await checkUserRateLimit(clientIp, 'promote-waitlist', 20, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      console.warn('[Waitlist Promote] Rate limit exceeded for IP:', clientIp);
      return createRateLimitResponse(rateLimit.retryAfter!, corsHeaders);
    }
    const { bookingLinkId, cancelledDate } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get booking link details
    const { data: bookingLink, error: linkError } = await supabaseClient
      .from("booking_links")
      .select("*")
      .eq("id", bookingLinkId)
      .single();

    if (linkError || !bookingLink) {
      throw new Error("Booking link not found");
    }

    // Find waitlist entries
    const cancelledDateOnly = cancelledDate?.split('T')[0];
    
    const { data: waitlistEntries, error: waitlistError } = await supabaseClient
      .from("booking_waitlist")
      .select("*")
      .eq("booking_link_id", bookingLinkId)
      .eq("notified", false)
      .order("created_at", { ascending: true })
      .limit(5);

    if (waitlistError) throw waitlistError;

    if (!waitlistEntries || waitlistEntries.length === 0) {
      console.log('[Waitlist Promote] No one on waitlist');
      return new Response(
        JSON.stringify({ promoted: false, reason: "No waitlist entries" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find best match (preferred date matches)
    const waitlistEntry = waitlistEntries.find(entry => 
      entry.preferred_dates?.includes(cancelledDateOnly)
    ) || waitlistEntries[0];

    console.log('[Waitlist Promote] Best match found:', waitlistEntry.guest_email);

    // Update waitlist status
    const { error: updateError } = await supabaseClient
      .from("booking_waitlist")
      .update({
        notified: true,
        notified_at: new Date().toISOString(),
      })
      .eq("id", waitlistEntry.id);

    if (updateError) throw updateError;

    // Send notification email using Resend
    const bookingUrl = `${Deno.env.get("SITE_URL") || "https://thequantumclub.com"}/book/${bookingLink.slug}`;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (resendApiKey) {
      const emailContent = `
        ${Heading({ text: '🎉 A Spot Just Opened Up!', level: 1 })}
        ${Spacer(24)}
        ${Paragraph(`Great news, ${waitlistEntry.guest_name}!`, 'primary')}
        ${Spacer(16)}
        ${Paragraph('A time slot has become available for:', 'secondary')}
        ${Spacer(32)}
        ${Card({
          variant: 'highlight',
          content: `
            ${Heading({ text: bookingLink.title, level: 2 })}
            ${Spacer(16)}
            ${Paragraph('⏰ <strong>Act fast!</strong> This exclusive slot expires in 24 hours.', 'secondary')}
            ${Spacer(24)}
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td align="center">
                  ${Button({ url: bookingUrl, text: 'Claim Your Spot Now →', variant: 'primary' })}
                </td>
              </tr>
            </table>
          `
        })}
        ${Spacer(32)}
        ${Paragraph('If you don\'t book within 24 hours, we\'ll offer this to the next person on the waitlist.', 'muted')}
      `;

      const html = baseEmailTemplate({
        preheader: `A spot opened up for ${bookingLink.title}`,
        content: emailContent,
        showHeader: true,
        showFooter: true
      });

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "The Quantum Club <bookings@thequantumclub.com>",
          to: [waitlistEntry.guest_email],
          subject: `🎉 A Spot Opened Up! - ${bookingLink.title}`,
          html,
        }),
      });
    }

    // PHASE 3: Create a reservation for the waitlist entry
    // This allows us to auto-create meeting when they book
    const reservationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const { error: reservationError } = await supabaseClient
      .from("booking_waitlist")
      .update({
        reservation_expires_at: reservationExpiry,
        reservation_active: true,
      })
      .eq("id", waitlistEntry.id);

    if (reservationError) {
      console.warn("[Waitlist Promote] Failed to create reservation:", reservationError);
    }

    console.log("[Waitlist Promote] Successfully notified and reserved slot for:", waitlistEntry.guest_email);

    return new Response(
      JSON.stringify({
        promoted: true,
        notified: waitlistEntry.guest_email,
        reservationExpiry,
        waitlistId: waitlistEntry.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error promoting waitlist:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
