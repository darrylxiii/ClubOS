import { createAuthenticatedHandler } from '../_shared/handler.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
    const corsHeaders = ctx.corsHeaders;
    const supabaseClient = ctx.supabase;
    const user = ctx.user;

    const { bookingId, action, rejectionReason } = await req.json();

    if (!bookingId || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: bookingId and action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Must be 'approve' or 'reject'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the booking and verify ownership
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        booking_links!inner(
          id,
          title,
          user_id,
          create_quantum_meeting,
          primary_calendar_id
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns this booking
    if (booking.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Not authorized to manage this booking" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify booking is in pending status
    if (booking.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Booking is already ${booking.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();

    if (action === "approve") {
      // Update booking status to confirmed
      const { error: updateError } = await supabaseClient
        .from("bookings")
        .update({
          status: "confirmed",
          approved_at: now,
          approved_by: user.id,
        })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      // Update approval request if exists
      await supabaseClient
        .from("booking_approval_requests")
        .update({
          status: "approved",
          reviewed_at: now,
          reviewed_by: user.id,
        })
        .eq("booking_id", bookingId);

      // Trigger meeting creation if configured
      if (booking.booking_links?.create_quantum_meeting) {
        console.log("[Approve Booking] Triggering meeting creation for approved booking");
        
        try {
          await supabaseClient.functions.invoke("create-meeting-from-booking", {
            body: { bookingId }
          });
        } catch (meetingError) {
          console.error("[Approve Booking] Failed to create meeting:", meetingError);
          // Don't fail the approval if meeting creation fails
        }
      }

      // Send confirmation email to guest
      try {
        await supabaseClient.functions.invoke("send-booking-confirmation", {
          body: {
            booking: { ...booking, status: "confirmed" },
            bookingLink: booking.booking_links,
          },
        });
      } catch (emailError) {
        console.error("[Approve Booking] Failed to send confirmation email:", emailError);
      }

      // Create in-app notification for guest about approval
      // First, try to find if guest has a user account
      const { data: guestUser } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', booking.guest_email)
        .single();
      
      if (guestUser) {
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: guestUser.id,
            type: 'booking_confirmation',
            title: `Your booking has been approved!`,
            content: `Your booking request for "${booking.booking_links?.title}" has been confirmed.`,
            action_url: `/bookings/${bookingId}`,
            metadata: {
              booking_id: bookingId,
              scheduled_start: booking.scheduled_start,
              booking_link_title: booking.booking_links?.title,
            },
            is_read: false,
          });
        console.log("[Approve Booking] Created in-app notification for guest about approval");
      }

      // Sync to calendar
      if (booking.booking_links?.primary_calendar_id) {
        try {
          await supabaseClient.functions.invoke("sync-booking-to-calendar", {
            body: { bookingId }
          });
        } catch (syncError) {
          console.error("[Approve Booking] Failed to sync to calendar:", syncError);
        }
      }

      console.log("[Approve Booking] Successfully approved booking:", bookingId);

      return new Response(
        JSON.stringify({
          success: true,
          action: "approved",
          bookingId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "reject") {
      // Update booking status to cancelled with rejection reason
      const { error: updateError } = await supabaseClient
        .from("bookings")
        .update({
          status: "cancelled",
          rejection_reason: rejectionReason || "Booking request declined",
        })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      // Update approval request
      await supabaseClient
        .from("booking_approval_requests")
        .update({
          status: "rejected",
          reviewed_at: now,
          reviewed_by: user.id,
          notes: rejectionReason,
        })
        .eq("booking_id", bookingId);

      // Create in-app notification for guest about rejection (if they have an account)
      const { data: guestUser } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', booking.guest_email)
        .single();
      
      if (guestUser) {
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: guestUser.id,
            type: 'booking_approval',
            title: `Booking request declined`,
            content: rejectionReason 
              ? `Your booking request for "${booking.booking_links?.title}" was declined: ${rejectionReason}`
              : `Your booking request for "${booking.booking_links?.title}" could not be confirmed.`,
            action_url: `/book/${booking.booking_links?.slug}`,
            metadata: {
              booking_id: bookingId,
              rejection_reason: rejectionReason,
              booking_link_slug: booking.booking_links?.slug,
            },
            is_read: false,
          });
        console.log("[Approve Booking] Created in-app notification for guest about rejection");
      }

      // Send rejection email to guest
      try {
        // Import email system dynamically
        const { sendEmail } = await import("../_shared/resend-client.ts");
        const { baseEmailTemplate } = await import("../_shared/email-templates/base-template.ts");
        const { Heading, Paragraph, Spacer, Card, Button } = await import("../_shared/email-templates/components.ts");
        const { EMAIL_SENDERS, EMAIL_COLORS } = await import("../_shared/email-config.ts");

        const meetingTitle = booking.booking_links?.title || "Meeting";
        const bookingSlug = booking.booking_links?.slug;
        const appUrl = Deno.env.get("APP_URL") || "https://os.thequantumclub.com";

        const emailContent = `
          ${Heading({ text: 'Booking Request Update', level: 1 })}
          ${Spacer(16)}
          ${Paragraph(`Hi ${booking.guest_name},`, 'primary')}
          ${Spacer(8)}
          ${Paragraph(`Unfortunately, your booking request for <strong>${meetingTitle}</strong> could not be confirmed.`, 'secondary')}
          ${rejectionReason ? `
            ${Spacer(16)}
            ${Card({
              variant: 'default',
              content: `
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${EMAIL_COLORS.textSecondary};">Reason</p>
                <p style="margin: 8px 0 0; font-size: 14px; color: ${EMAIL_COLORS.textPrimary};">${rejectionReason}</p>
              `,
            })}
          ` : ''}
          ${Spacer(24)}
          ${Paragraph('Please feel free to request a different time slot.', 'secondary')}
          ${bookingSlug ? `
            ${Spacer(16)}
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td align="center">
                  ${Button({ url: `${appUrl}/book/${bookingSlug}`, text: 'Book Another Time', variant: 'primary' })}
                </td>
              </tr>
            </table>
          ` : ''}
          ${Spacer(24)}
          ${Paragraph('Best regards,<br><strong>The Quantum Club</strong>', 'secondary')}
        `;

        await sendEmail({
          from: EMAIL_SENDERS.bookings,
          to: [booking.guest_email],
          subject: `Booking Request Update - ${meetingTitle}`,
          html: baseEmailTemplate({
            preheader: `Your booking request for ${meetingTitle} could not be confirmed`,
            content: emailContent,
            showHeader: true,
            showFooter: true,
          }),
        });
      } catch (emailError) {
        console.error("[Approve Booking] Failed to send rejection email:", emailError);
      }

      console.log("[Approve Booking] Successfully rejected booking:", bookingId);

      return new Response(
        JSON.stringify({
          success: true,
          action: "rejected",
          bookingId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

}));
