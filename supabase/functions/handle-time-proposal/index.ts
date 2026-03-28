import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { EMAIL_SENDERS, EMAIL_COLORS } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { Heading, Paragraph, Spacer, Card, StatusBadge, InfoRow, Button } from "../_shared/email-templates/components.ts";
import { z, parseBody, uuidSchema, isoDateSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

interface HandleProposalRequest {
  proposalId: string;
  action: 'accept' | 'decline' | 'counter';
  responseMessage?: string;
  // For counter-proposal
  counterStart?: string;
  counterEnd?: string;
}

const proposalRequestSchema = z.object({
  proposalId: uuidSchema,
  action: z.enum(['accept', 'decline', 'counter']),
  responseMessage: z.string().max(2000).trim().optional(),
  counterStart: isoDateSchema.optional(),
  counterEnd: isoDateSchema.optional(),
});

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
    const { supabase: supabaseClient, user, corsHeaders } = ctx;

    const parsed = await parseBody(req, proposalRequestSchema, corsHeaders);
    if ('error' in parsed) return parsed.error;
    const { proposalId, action, responseMessage, counterStart, counterEnd } = parsed.data;
    const safeResponseMessage = sanitizeForEmail(responseMessage);

    // Get the proposal with booking and verify ownership
    const { data: proposal, error: fetchError } = await supabaseClient
      .from("booking_time_proposals")
      .select(`
        *,
        bookings!inner(
          id, guest_email, guest_name, scheduled_start, scheduled_end,
          booking_links!inner(
            id, title, user_id
          )
        )
      `)
      .eq("id", proposalId)
      .single();

    if (fetchError || !proposal) {
      return new Response(
        JSON.stringify({ error: "Proposal not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user is the host
    if (proposal.bookings.booking_links.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You are not authorized to respond to this proposal" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (proposal.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Proposal has already been ${proposal.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case 'accept': {
        // Update the proposal status
        await supabaseClient
          .from("booking_time_proposals")
          .update({
            status: 'accepted',
            responded_at: new Date().toISOString(),
            response_message: responseMessage?.trim() || null,
          })
          .eq("id", proposalId);

        // Update the booking with new times
        await supabaseClient
          .from("bookings")
          .update({
            scheduled_start: proposal.proposed_start,
            scheduled_end: proposal.proposed_end,
            updated_at: new Date().toISOString(),
          })
          .eq("id", proposal.booking_id);

        // Notify proposer
        try {
          const formattedDate = new Date(proposal.proposed_start).toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          });
          const formattedTime = new Date(proposal.proposed_start).toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit",
          });

          const emailContent = `
            ${StatusBadge({ status: 'confirmed', text: 'TIME PROPOSAL ACCEPTED' })}
            ${Heading({ text: 'Your Proposed Time Was Accepted', level: 1 })}
            ${Spacer(16)}
            ${Paragraph(`Great news. Your time proposal for "<strong>${proposal.bookings.booking_links.title}</strong>" has been accepted.`, 'secondary')}
            ${Spacer(16)}
            ${Card({
              variant: 'success',
              content: `
                ${InfoRow({ icon: '📅', label: 'New Date', value: formattedDate })}
                ${InfoRow({ icon: '🕐', label: 'New Time', value: formattedTime })}
                ${safeResponseMessage ? InfoRow({ icon: '💬', label: 'Message', value: safeResponseMessage }) : ''}
              `,
            })}
            ${Spacer(16)}
            ${Paragraph('Your calendar invite will be updated automatically.', 'muted')}
          `;

          await sendEmail({
            from: EMAIL_SENDERS.bookings,
            to: [proposal.proposed_by_email],
            subject: `Time Proposal Accepted — ${proposal.bookings.booking_links.title}`,
            html: baseEmailTemplate({
              preheader: `Your proposed time for ${proposal.bookings.booking_links.title} was accepted`,
              content: emailContent,
              showHeader: true,
              showFooter: true,
            }),
          });
        } catch (emailErr) {
          console.error('[HandleProposal] Failed to send accept email:', emailErr);
        }

        console.log(`[HandleProposal] Accepted proposal ${proposalId}`);

        return new Response(
          JSON.stringify({ success: true, status: 'accepted' }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'decline': {
        await supabaseClient
          .from("booking_time_proposals")
          .update({
            status: 'declined',
            responded_at: new Date().toISOString(),
            response_message: responseMessage?.trim() || null,
          })
          .eq("id", proposalId);

        // Notify proposer
        try {
          const emailContent = `
            ${StatusBadge({ status: 'cancelled', text: 'TIME PROPOSAL DECLINED' })}
            ${Heading({ text: 'Time Proposal Not Available', level: 1 })}
            ${Spacer(16)}
            ${Paragraph(`Unfortunately, your proposed time for "<strong>${proposal.bookings.booking_links.title}</strong>" could not be accommodated.`, 'secondary')}
            ${safeResponseMessage ? `
              ${Spacer(16)}
              ${Card({
                variant: 'default',
                content: InfoRow({ icon: '💬', label: 'Message from host', value: safeResponseMessage }),
              })}
            ` : ''}
            ${Spacer(16)}
            ${Paragraph('The original meeting time remains unchanged. You may propose another time if needed.', 'muted')}
          `;

          await sendEmail({
            from: EMAIL_SENDERS.bookings,
            to: [proposal.proposed_by_email],
            subject: `Time Proposal Declined — ${proposal.bookings.booking_links.title}`,
            html: baseEmailTemplate({
              preheader: `Your proposed time for ${proposal.bookings.booking_links.title} could not be accommodated`,
              content: emailContent,
              showHeader: true,
              showFooter: true,
            }),
          });
        } catch (emailErr) {
          console.error('[HandleProposal] Failed to send decline email:', emailErr);
        }

        console.log(`[HandleProposal] Declined proposal ${proposalId}`);

        return new Response(
          JSON.stringify({ success: true, status: 'declined' }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'counter': {
        if (!counterStart || !counterEnd) {
          return new Response(
            JSON.stringify({ error: "counterStart and counterEnd are required for counter-proposal" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Decline the original proposal
        await supabaseClient
          .from("booking_time_proposals")
          .update({
            status: 'declined',
            responded_at: new Date().toISOString(),
            response_message: `Counter-proposal sent: ${new Date(counterStart).toLocaleString()}`,
          })
          .eq("id", proposalId);

        // Get host profile
        const { data: hostProfile } = await supabaseClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", user.id)
          .single();

        // Create a new proposal from the host
        const { data: counterProposal, error: insertError } = await supabaseClient
          .from("booking_time_proposals")
          .insert({
            booking_id: proposal.booking_id,
            proposed_by_email: hostProfile?.email || user.email,
            proposed_by_name: hostProfile?.full_name || 'Host',
            proposed_by_type: 'booker', // Host acts as counter-proposer
            proposed_start: counterStart,
            proposed_end: counterEnd,
            message: responseMessage?.trim() || 'Counter-proposal from host',
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        // Notify the original proposer
        try {
          const formattedDate = new Date(counterStart).toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          });
          const formattedTime = new Date(counterStart).toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit",
          });

          const emailContent = `
            ${StatusBadge({ status: 'pending', text: 'COUNTER-PROPOSAL' })}
            ${Heading({ text: 'Host Has Suggested a Different Time', level: 1 })}
            ${Spacer(16)}
            ${Paragraph('The host could not accommodate your proposed time but has suggested an alternative.', 'secondary')}
            ${Spacer(16)}
            ${Card({
              variant: 'highlight',
              content: `
                ${InfoRow({ icon: '📅', label: 'Suggested Date', value: formattedDate })}
                ${InfoRow({ icon: '🕐', label: 'Suggested Time', value: formattedTime })}
                ${safeResponseMessage ? InfoRow({ icon: '💬', label: 'Message', value: safeResponseMessage }) : ''}
              `,
            })}
            ${Spacer(16)}
            ${Paragraph('Please respond to let the host know if this time works for you.', 'secondary')}
          `;

          await sendEmail({
            from: EMAIL_SENDERS.bookings,
            to: [proposal.proposed_by_email],
            subject: `Counter-Proposal — ${proposal.bookings.booking_links.title}`,
            html: baseEmailTemplate({
              preheader: `The host suggested a different time for ${proposal.bookings.booking_links.title}`,
              content: emailContent,
              showHeader: true,
              showFooter: true,
            }),
          });
        } catch (emailErr) {
          console.error('[HandleProposal] Failed to send counter-proposal email:', emailErr);
        }

        console.log(`[HandleProposal] Counter-proposal created for ${proposalId}`);

        return new Response(
          JSON.stringify({ success: true, status: 'counter', counterProposal }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

}));
