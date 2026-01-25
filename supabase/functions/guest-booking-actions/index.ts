import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { EMAIL_SENDERS } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GuestActionRequest {
  action: 'get_details' | 'cancel' | 'propose_time' | 'add_guest';
  accessToken?: string;       // For additional guests (from booking_guests table)
  bookingId?: string;         // For booker (with email verification)
  guestEmail?: string;        // For booker verification
  
  // Action-specific data
  cancelReason?: string;
  proposedStart?: string;
  proposedEnd?: string;
  proposalMessage?: string;
  newGuestEmail?: string;
  newGuestName?: string;
  newGuestPermissions?: {
    can_cancel?: boolean;
    can_reschedule?: boolean;
    can_propose_times?: boolean;
    can_add_attendees?: boolean;
  };
}

interface GuestContext {
  type: 'booker' | 'guest';
  email: string;
  name?: string;
  bookingId: string;
  permissions: {
    can_cancel: boolean;
    can_reschedule: boolean;
    can_propose_times: boolean;
    can_add_attendees: boolean;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: GuestActionRequest = await req.json();
    const { action, accessToken, bookingId, guestEmail } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Action is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate the request - determine if booker or guest
    let context: GuestContext | null = null;

    if (accessToken) {
      // Guest authentication via access token
      const { data: guestRecord, error: guestError } = await supabaseClient
        .from("booking_guests")
        .select(`
          id, email, name, booking_id,
          can_cancel, can_reschedule, can_propose_times, can_add_attendees
        `)
        .eq("access_token", accessToken)
        .single();

      if (guestError || !guestRecord) {
        console.error("[GuestActions] Invalid access token");
        return new Response(
          JSON.stringify({ error: "Invalid or expired access token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update last accessed
      await supabaseClient
        .from("booking_guests")
        .update({ last_accessed_at: new Date().toISOString() })
        .eq("id", guestRecord.id);

      context = {
        type: 'guest',
        email: guestRecord.email,
        name: guestRecord.name,
        bookingId: guestRecord.booking_id,
        permissions: {
          can_cancel: guestRecord.can_cancel || false,
          can_reschedule: guestRecord.can_reschedule || false,
          can_propose_times: guestRecord.can_propose_times || false,
          can_add_attendees: guestRecord.can_add_attendees || false,
        },
      };
    } else if (bookingId && guestEmail) {
      // Booker authentication via booking ID + email
      const { data: booking, error: bookingError } = await supabaseClient
        .from("bookings")
        .select(`
          id, guest_email, guest_name, delegated_permissions,
          booking_links!inner(
            guest_permissions
          )
        `)
        .eq("id", bookingId)
        .single();

      if (bookingError || !booking) {
        console.error("[GuestActions] Booking not found");
        return new Response(
          JSON.stringify({ error: "Booking not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (booking.guest_email.toLowerCase() !== guestEmail.toLowerCase()) {
        console.error("[GuestActions] Email mismatch");
        return new Response(
          JSON.stringify({ error: "Email does not match booking" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Booker gets permissions from host's booking_link settings
      const bookingLink = booking.booking_links as unknown as { guest_permissions?: Record<string, boolean> };
      const hostPerms = bookingLink?.guest_permissions || {};
      
      context = {
        type: 'booker',
        email: booking.guest_email,
        name: booking.guest_name,
        bookingId: booking.id,
        permissions: {
          can_cancel: hostPerms.allow_guest_cancel || true, // Bookers can always cancel by default
          can_reschedule: hostPerms.allow_guest_reschedule || true,
          can_propose_times: hostPerms.allow_guest_propose_times || true,
          can_add_attendees: hostPerms.allow_guest_add_attendees || false,
        },
      };
    } else {
      return new Response(
        JSON.stringify({ error: "Authentication required. Provide accessToken or bookingId + guestEmail" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[GuestActions] Authenticated ${context.type}: ${context.email} for action: ${action}`);

    // Execute the requested action
    switch (action) {
      case 'get_details':
        return await handleGetDetails(supabaseClient, context);
      case 'cancel':
        return await handleCancel(supabaseClient, context, body);
      case 'propose_time':
        return await handleProposeTime(supabaseClient, context, body);
      case 'add_guest':
        return await handleAddGuest(supabaseClient, context, body);
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error: any) {
    console.error("[GuestActions] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ===== Action Handlers =====

async function handleGetDetails(supabase: any, context: GuestContext) {
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      id, guest_name, guest_email, guest_phone,
      scheduled_start, scheduled_end, status, notes,
      quantum_meeting_link, video_meeting_link, google_meet_hangout_link,
      delegated_permissions,
      booking_links!inner(
        id, slug, title, duration_minutes, color, guest_permissions,
        user_id
      )
    `)
    .eq("id", context.bookingId)
    .single();

  if (error || !booking) {
    return new Response(
      JSON.stringify({ error: "Booking not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get host profile
  const { data: hostProfile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", booking.booking_links.user_id)
    .single();

  // Get all guests for this booking
  const { data: guests } = await supabase
    .from("booking_guests")
    .select("id, email, name, can_cancel, can_reschedule, can_propose_times, can_add_attendees")
    .eq("booking_id", context.bookingId);

  // Get pending time proposals
  const { data: proposals } = await supabase
    .from("booking_time_proposals")
    .select("*")
    .eq("booking_id", context.bookingId)
    .order("created_at", { ascending: false });

  return new Response(
    JSON.stringify({
      success: true,
      booking: {
        ...booking,
        host: hostProfile,
        guests: guests || [],
        proposals: proposals || [],
      },
      viewer: {
        type: context.type,
        email: context.email,
        permissions: context.permissions,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleCancel(supabase: any, context: GuestContext, body: GuestActionRequest) {
  if (!context.permissions.can_cancel) {
    return new Response(
      JSON.stringify({ error: "You do not have permission to cancel this booking" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { cancelReason } = body;
  if (!cancelReason?.trim()) {
    return new Response(
      JSON.stringify({ error: "Cancellation reason is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get booking details
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select(`
      *,
      booking_links!inner(title, user_id)
    `)
    .eq("id", context.bookingId)
    .single();

  if (fetchError || !booking) {
    return new Response(
      JSON.stringify({ error: "Booking not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (booking.status === "cancelled") {
    return new Response(
      JSON.stringify({ error: "Booking is already cancelled" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Cancel the booking
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: cancelReason.trim(),
      cancelled_by_email: context.email,
      cancelled_by_type: context.type,
    })
    .eq("id", context.bookingId);

  if (updateError) {
    throw updateError;
  }

  // Get host profile for notification
  const { data: hostProfile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", booking.booking_links.user_id)
    .single();

  // Send cancellation notifications to all parties
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (resendApiKey && hostProfile?.email) {
    const formattedDate = new Date(booking.scheduled_start).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const emailContent = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; padding: 8px 16px; background-color: #FEE2E2; color: #DC2626; border-radius: 8px; font-weight: 600; font-size: 14px;">
          BOOKING CANCELLED BY ${context.type.toUpperCase()}
        </div>
      </div>
      <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
        ${booking.booking_links.title} - Cancelled
      </h1>
      <p style="margin-bottom: 24px;">
        <strong>${context.name || context.email}</strong> (${context.type}) has cancelled the booking.
      </p>
      <div style="padding: 16px; background-color: #f3f4f6; border-radius: 8px; margin-bottom: 24px;">
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Reason:</strong> ${cancelReason}</p>
      </div>
    `;

    // Notify host
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: EMAIL_SENDERS.bookings,
        to: [hostProfile.email],
        subject: `Booking Cancelled - ${booking.guest_name}`,
        html: baseEmailTemplate({ content: emailContent }),
      }),
    });

    // Notify booker if cancelled by guest
    if (context.type === 'guest') {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: EMAIL_SENDERS.bookings,
          to: [booking.guest_email],
          subject: `Booking Cancelled by Guest - ${booking.booking_links.title}`,
          html: baseEmailTemplate({ content: emailContent }),
        }),
      });
    }
  }

  console.log(`[GuestActions] Booking ${context.bookingId} cancelled by ${context.type}: ${context.email}`);

  return new Response(
    JSON.stringify({ success: true, message: "Booking cancelled successfully" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleProposeTime(supabase: any, context: GuestContext, body: GuestActionRequest) {
  if (!context.permissions.can_propose_times) {
    return new Response(
      JSON.stringify({ error: "You do not have permission to propose alternative times" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { proposedStart, proposedEnd, proposalMessage } = body;
  
  if (!proposedStart || !proposedEnd) {
    return new Response(
      JSON.stringify({ error: "Proposed start and end times are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate times
  const startDate = new Date(proposedStart);
  const endDate = new Date(proposedEnd);
  
  if (startDate <= new Date()) {
    return new Response(
      JSON.stringify({ error: "Proposed time must be in the future" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (endDate <= startDate) {
    return new Response(
      JSON.stringify({ error: "End time must be after start time" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create the proposal
  const { data: proposal, error: insertError } = await supabase
    .from("booking_time_proposals")
    .insert({
      booking_id: context.bookingId,
      proposed_by_email: context.email,
      proposed_by_name: context.name,
      proposed_by_type: context.type,
      proposed_start: proposedStart,
      proposed_end: proposedEnd,
      message: proposalMessage?.trim() || null,
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  // Get booking and host info for notification
  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      guest_name, guest_email,
      booking_links!inner(title, user_id)
    `)
    .eq("id", context.bookingId)
    .single();

  if (booking) {
    const { data: hostProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", booking.booking_links.user_id)
      .single();

    // Notify host of the proposal
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey && hostProfile?.email) {
      const formattedDate = new Date(proposedStart).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
      const formattedTime = new Date(proposedStart).toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit",
      });

      const emailContent = `
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; padding: 8px 16px; background-color: #FEF3C7; color: #B45309; border-radius: 8px; font-weight: 600; font-size: 14px;">
            NEW TIME PROPOSAL
          </div>
        </div>
        <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
          Alternative Time Requested
        </h1>
        <p style="margin-bottom: 24px;">
          <strong>${context.name || context.email}</strong> has proposed a new time for "${booking.booking_links.title}".
        </p>
        <div style="padding: 16px; background-color: #f3f4f6; border-radius: 8px; margin-bottom: 24px;">
          <p><strong>Proposed Date:</strong> ${formattedDate}</p>
          <p><strong>Proposed Time:</strong> ${formattedTime}</p>
          ${proposalMessage ? `<p><strong>Message:</strong> ${proposalMessage}</p>` : ''}
        </div>
        <p>Log in to your scheduling dashboard to accept, decline, or counter-propose.</p>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: EMAIL_SENDERS.bookings,
          to: [hostProfile.email],
          subject: `⏰ New Time Proposal for ${booking.booking_links.title}`,
          html: baseEmailTemplate({ content: emailContent }),
        }),
      });
    }
  }

  console.log(`[GuestActions] Time proposal created by ${context.type}: ${context.email}`);

  return new Response(
    JSON.stringify({ success: true, proposal }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleAddGuest(supabase: any, context: GuestContext, body: GuestActionRequest) {
  if (!context.permissions.can_add_attendees) {
    return new Response(
      JSON.stringify({ error: "You do not have permission to add attendees" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { newGuestEmail, newGuestName, newGuestPermissions } = body;
  
  if (!newGuestEmail?.trim()) {
    return new Response(
      JSON.stringify({ error: "Guest email is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newGuestEmail)) {
    return new Response(
      JSON.stringify({ error: "Invalid email format" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if guest already exists
  const { data: existingGuest } = await supabase
    .from("booking_guests")
    .select("id")
    .eq("booking_id", context.bookingId)
    .eq("email", newGuestEmail.toLowerCase())
    .single();

  if (existingGuest) {
    return new Response(
      JSON.stringify({ error: "This guest has already been added" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get booking to check limits and host permissions
  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      guest_email,
      booking_links!inner(
        title, user_id, guest_permissions
      )
    `)
    .eq("id", context.bookingId)
    .single();

  // Cap new guest permissions by context.permissions
  const guestPerms = {
    can_cancel: (newGuestPermissions?.can_cancel || false) && context.permissions.can_cancel,
    can_reschedule: (newGuestPermissions?.can_reschedule || false) && context.permissions.can_reschedule,
    can_propose_times: (newGuestPermissions?.can_propose_times ?? true) && context.permissions.can_propose_times,
    can_add_attendees: (newGuestPermissions?.can_add_attendees || false) && context.permissions.can_add_attendees,
  };

  // Create the guest record
  const { data: newGuest, error: insertError } = await supabase
    .from("booking_guests")
    .insert({
      booking_id: context.bookingId,
      email: newGuestEmail.trim().toLowerCase(),
      name: newGuestName?.trim() || null,
      ...guestPerms,
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  // Send invitation email to the new guest
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (resendApiKey && booking) {
    const { data: bookingDetails } = await supabase
      .from("bookings")
      .select("scheduled_start, scheduled_end, guest_name")
      .eq("id", context.bookingId)
      .single();

    if (bookingDetails) {
      const formattedDate = new Date(bookingDetails.scheduled_start).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
      const formattedTime = new Date(bookingDetails.scheduled_start).toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit",
      });

      // Get host name
      const { data: hostProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", booking.booking_links.user_id)
        .single();

      const appUrl = Deno.env.get("PUBLIC_APP_URL") || "https://thequantumclub.app";
      const portalUrl = `${appUrl}/booking/${context.bookingId}/guest/${newGuest.access_token}`;

      const emailContent = `
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; padding: 8px 16px; background-color: #DBEAFE; color: #1D4ED8; border-radius: 8px; font-weight: 600; font-size: 14px;">
            YOU'RE INVITED
          </div>
        </div>
        <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
          ${booking.booking_links.title}
        </h1>
        <p style="margin-bottom: 24px;">
          <strong>${bookingDetails.guest_name}</strong> has invited you to join a meeting.
        </p>
        <div style="padding: 16px; background-color: #f3f4f6; border-radius: 8px; margin-bottom: 24px;">
          <p><strong>📅 Date:</strong> ${formattedDate}</p>
          <p><strong>🕐 Time:</strong> ${formattedTime}</p>
          <p><strong>👤 Host:</strong> ${hostProfile?.full_name || 'Your Host'}</p>
          <p><strong>📧 Booked by:</strong> ${bookingDetails.guest_name}</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${portalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #C9A24E; color: #0E0E10; text-decoration: none; border-radius: 8px; font-weight: 600;">
            View Booking Details
          </a>
        </div>
        <p style="font-size: 14px; color: #6b7280; text-align: center;">
          You can manage your participation using the link above.
        </p>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: EMAIL_SENDERS.bookings,
          to: [newGuestEmail],
          subject: `You're invited: ${booking.booking_links.title} - ${formattedDate}`,
          html: baseEmailTemplate({ content: emailContent }),
        }),
      });

      // Update email_sent_at
      await supabase
        .from("booking_guests")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", newGuest.id);
    }
  }

  console.log(`[GuestActions] New guest added by ${context.type}: ${newGuestEmail}`);

  return new Response(
    JSON.stringify({ success: true, guest: newGuest }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
