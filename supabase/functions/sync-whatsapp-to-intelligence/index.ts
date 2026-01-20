import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppSyncRequest {
  messageId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { messageId }: WhatsAppSyncRequest = await req.json();

    if (!messageId) {
      return new Response(
        JSON.stringify({ error: "messageId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch message with conversation context
    const { data: message, error: msgError } = await supabase
      .from("whatsapp_messages")
      .select(`
        *,
        conversation:whatsapp_conversations(
          id,
          candidate_id,
          prospect_id,
          company_id,
          candidate_phone,
          candidate_name,
          stakeholder_type
        )
      `)
      .eq("id", messageId)
      .single();

    if (msgError || !message) {
      console.error("Error fetching message:", msgError);
      return new Response(
        JSON.stringify({ error: "Message not found", details: msgError }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const conversation = message.conversation;
    const results: Record<string, unknown> = {};

    // 1. Sync to unified_communications if the function exists
    try {
      const { data: unifiedResult, error: unifiedError } = await supabase.functions.invoke(
        "sync-communication-to-unified",
        {
          body: {
            source_table: "whatsapp_messages",
            source_id: messageId,
          },
        }
      );
      results.unified = unifiedError ? { error: unifiedError.message } : unifiedResult;
    } catch (e) {
      console.log("Unified sync skipped (function may not exist):", e);
      results.unified = { skipped: true };
    }

    // 2. If company/partner linked, create company_interaction
    if (conversation?.company_id || conversation?.stakeholder_type === "partner") {
      try {
        const { data: interactionResult, error: interactionError } = await supabase
          .from("company_interactions")
          .insert({
            company_id: conversation.company_id,
            interaction_type: "whatsapp",
            interaction_subtype: message.template_name ? "template" : "text",
            direction: message.direction,
            subject: `WhatsApp: ${(message.content || "").substring(0, 50)}${
              (message.content || "").length > 50 ? "..." : ""
            }`,
            summary: message.content,
            raw_content: JSON.stringify({
              whatsapp_message_id: message.id,
              phone: conversation.candidate_phone,
              template: message.template_name,
            }),
            sentiment_score: message.sentiment_score,
            source_metadata: { whatsapp_message_id: message.id },
            status: "logged",
            processing_status: "completed",
          })
          .select("id")
          .single();

        results.companyInteraction = interactionError
          ? { error: interactionError.message }
          : { id: interactionResult?.id };
      } catch (e) {
        console.log("Company interaction insert skipped:", e);
        results.companyInteraction = { skipped: true };
      }
    }

    // 3. Log to activity_feed if candidate linked
    if (conversation?.candidate_id) {
      try {
        const { error: activityError } = await supabase.from("activity_feed").insert({
          user_id: conversation.candidate_id,
          event_type: `whatsapp_${message.direction}`,
          event_data: {
            conversation_id: conversation.id,
            message_id: message.id,
            message_preview: (message.content || "").substring(0, 100),
            sentiment: message.sentiment_score,
            intent: message.intent_classification,
            template_name: message.template_name,
          },
          visibility: "internal",
        });

        results.activityFeed = activityError ? { error: activityError.message } : { success: true };
      } catch (e) {
        console.log("Activity feed insert skipped:", e);
        results.activityFeed = { skipped: true };
      }
    }

    // 4. Queue ML feature update if candidate has applications
    if (conversation?.candidate_id) {
      try {
        const { data: applications } = await supabase
          .from("applications")
          .select("id")
          .eq("candidate_id", conversation.candidate_id)
          .in("status", ["applied", "screening", "interviewing", "shortlisted"])
          .limit(10);

        if (applications && applications.length > 0) {
          const queueItems = applications.map((app) => ({
            entity_type: "applications",
            entity_id: app.id,
            processing_type: "update_communication_features",
            priority: 6,
            source_data: {
              whatsapp_message_id: message.id,
              message_direction: message.direction,
            },
          }));

          const { error: queueError } = await supabase
            .from("intelligence_queue")
            .insert(queueItems);

          results.mlQueue = queueError
            ? { error: queueError.message }
            : { queued: applications.length };
        } else {
          results.mlQueue = { skipped: "no_active_applications" };
        }
      } catch (e) {
        console.log("ML queue insert skipped:", e);
        results.mlQueue = { skipped: true };
      }
    }

    // 5. Update candidate communication stats
    if (conversation?.candidate_id) {
      try {
        // Get current stats
        const { data: candidate } = await supabase
          .from("candidate_profiles")
          .select("communication_stats")
          .eq("id", conversation.candidate_id)
          .single();

        const currentStats = (candidate?.communication_stats as Record<string, unknown>) || {};
        const whatsappStats = (currentStats.whatsapp as Record<string, unknown>) || {};

        // Calculate updated stats
        const updatedWhatsappStats = {
          total_messages: ((whatsappStats.total_messages as number) || 0) + 1,
          inbound_count:
            ((whatsappStats.inbound_count as number) || 0) +
            (message.direction === "inbound" ? 1 : 0),
          outbound_count:
            ((whatsappStats.outbound_count as number) || 0) +
            (message.direction === "outbound" ? 1 : 0),
          last_message_at: new Date().toISOString(),
          last_direction: message.direction,
          latest_sentiment: message.sentiment_score,
          latest_intent: message.intent_classification,
        };

        const updatedStats = {
          ...currentStats,
          whatsapp: updatedWhatsappStats,
          last_communication_at: new Date().toISOString(),
          last_communication_channel: "whatsapp",
        };

        const { error: updateError } = await supabase
          .from("candidate_profiles")
          .update({ communication_stats: updatedStats })
          .eq("id", conversation.candidate_id);

        results.candidateStats = updateError ? { error: updateError.message } : { success: true };
      } catch (e) {
        console.log("Candidate stats update skipped:", e);
        results.candidateStats = { skipped: true };
      }
    }

    // 6. Update template analytics if this was a template message
    if (message.template_name) {
      try {
        const today = new Date().toISOString().split("T")[0];

        // Upsert analytics record
        const { error: analyticsError } = await supabase.rpc("upsert_template_analytics", {
          p_template_name: message.template_name,
          p_date: today,
          p_direction: message.direction,
          p_status: message.status,
          p_sentiment: message.sentiment_score,
        });

        results.templateAnalytics = analyticsError
          ? { error: analyticsError.message }
          : { success: true };
      } catch (e) {
        console.log("Template analytics update skipped:", e);
        results.templateAnalytics = { skipped: true };
      }
    }

    console.log("WhatsApp sync completed:", { messageId, results });

    return new Response(
      JSON.stringify({
        success: true,
        messageId,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in sync-whatsapp-to-intelligence:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
