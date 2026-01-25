import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { EMAIL_SENDERS } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HandleProposalRequest {
  proposalId: string;
  action: 'accept' | 'decline' | 'counter';
  responseMessage?: string;
  // For counter-proposal
  counterStart?: string;
  counterEnd?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: HandleProposalRequest = await req.json();
    const { proposalId, action, responseMessage, counterStart, counterEnd } = body;

    if (!proposalId || !action) {
      return new Response(
        JSON.stringify({ error: "proposalId and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

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
        if (resendApiKey) {
          const formattedDate = new Date(proposal.proposed_start).toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          });
          const formattedTime = new Date(proposal.proposed_start).toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit",
          });

          const emailContent = `
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; padding: 8px 16px; background-color: #D1FAE5; color: #065F46; border-radius: 8px; font-weight: 600; font-size: 14px;">
                TIME PROPOSAL ACCEPTED
              </div>
            </div>
            <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
              Your Proposed Time Was Accepted!
            </h1>
            <p style="margin-bottom: 24px;">
              Great news! Your time proposal for "${proposal.bookings.booking_links.title}" has been accepted.
            </p>
            <div style="padding: 16px; background-color: #f3f4f6; border-radius: 8px; margin-bottom: 24px;">
              <p><strong>📅 New Date:</strong> ${formattedDate}</p>
              <p><strong>🕐 New Time:</strong> ${formattedTime}</p>
              ${responseMessage ? `<p><strong>Message:</strong> ${responseMessage}</p>` : ''}
            </div>
            <p>Your calendar invite will be updated automatically.</p>
          `;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: EMAIL_SENDERS.bookings,
              to: [proposal.proposed_by_email],
              subject: `✅ Time Proposal Accepted - ${proposal.bookings.booking_links.title}`,
              html: baseEmailTemplate({ content: emailContent }),
            }),
          });
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
        if (resendApiKey) {
          const emailContent = `
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; padding: 8px 16px; background-color: #FEE2E2; color: #DC2626; border-radius: 8px; font-weight: 600; font-size: 14px;">
                TIME PROPOSAL DECLINED
              </div>
            </div>
            <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
              Time Proposal Not Available
            </h1>
            <p style="margin-bottom: 24px;">
              Unfortunately, your proposed time for "${proposal.bookings.booking_links.title}" could not be accommodated.
            </p>
            ${responseMessage ? `
              <div style="padding: 16px; background-color: #f3f4f6; border-radius: 8px; margin-bottom: 24px;">
                <p><strong>Message from host:</strong> ${responseMessage}</p>
              </div>
            ` : ''}
            <p>The original meeting time remains unchanged. You may propose another time if needed.</p>
          `;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: EMAIL_SENDERS.bookings,
              to: [proposal.proposed_by_email],
              subject: `Time Proposal Declined - ${proposal.bookings.booking_links.title}`,
              html: baseEmailTemplate({ content: emailContent }),
            }),
          });
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
        if (resendApiKey) {
          const formattedDate = new Date(counterStart).toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          });
          const formattedTime = new Date(counterStart).toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit",
          });

          const emailContent = `
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; padding: 8px 16px; background-color: #FEF3C7; color: #B45309; border-radius: 8px; font-weight: 600; font-size: 14px;">
                COUNTER-PROPOSAL
              </div>
            </div>
            <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
              Host Has Suggested a Different Time
            </h1>
            <p style="margin-bottom: 24px;">
              The host could not accommodate your proposed time but has suggested an alternative.
            </p>
            <div style="padding: 16px; background-color: #f3f4f6; border-radius: 8px; margin-bottom: 24px;">
              <p><strong>📅 Suggested Date:</strong> ${formattedDate}</p>
              <p><strong>🕐 Suggested Time:</strong> ${formattedTime}</p>
              ${responseMessage ? `<p><strong>Message:</strong> ${responseMessage}</p>` : ''}
            </div>
            <p>Please respond to let the host know if this time works for you.</p>
          `;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: EMAIL_SENDERS.bookings,
              to: [proposal.proposed_by_email],
              subject: `⏰ Counter-Proposal - ${proposal.bookings.booking_links.title}`,
              html: baseEmailTemplate({ content: emailContent }),
            }),
          });
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

  } catch (error: any) {
    console.error("[HandleProposal] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
