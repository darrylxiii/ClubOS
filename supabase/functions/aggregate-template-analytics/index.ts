import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AggregateRequest {
  date?: string; // Optional: specific date to aggregate, defaults to today
  templateName?: string; // Optional: specific template to aggregate
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { date, templateName }: AggregateRequest = await req.json().catch(() => ({}));
    const targetDate = date || new Date().toISOString().split("T")[0];

    console.log(`Aggregating template analytics for date: ${targetDate}`);

    // Get all template messages for the target date
    let messagesQuery = supabase
      .from("whatsapp_messages")
      .select(`
        id,
        template_name,
        direction,
        status,
        sentiment_score,
        created_at,
        conversation_id
      `)
      .not("template_name", "is", null)
      .gte("created_at", `${targetDate}T00:00:00`)
      .lt("created_at", `${targetDate}T23:59:59`);

    if (templateName) {
      messagesQuery = messagesQuery.eq("template_name", templateName);
    }

    const { data: messages, error: msgError } = await messagesQuery;

    if (msgError) {
      console.error("Error fetching messages:", msgError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch messages", details: msgError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group messages by template
    const templateGroups: Record<string, typeof messages> = {};
    for (const msg of messages || []) {
      if (!msg.template_name) continue;
      if (!templateGroups[msg.template_name]) {
        templateGroups[msg.template_name] = [];
      }
      templateGroups[msg.template_name].push(msg);
    }

    const results: Record<string, unknown> = {};

    // Process each template
    for (const [tplName, tplMessages] of Object.entries(templateGroups)) {
      const outbound = tplMessages.filter((m) => m.direction === "outbound");
      const sentCount = outbound.length;
      const deliveredCount = outbound.filter(
        (m) => m.status === "delivered" || m.status === "read"
      ).length;
      const readCount = outbound.filter((m) => m.status === "read").length;

      // Find replies (inbound messages in the same conversations within 24h)
      const conversationIds = [...new Set(outbound.map((m) => m.conversation_id))];
      let repliedCount = 0;
      let totalResponseTime = 0;
      let responseCount = 0;
      let positiveSentiment = 0;
      let negativeSentiment = 0;

      for (const convId of conversationIds) {
        const convOutbound = outbound.filter((m) => m.conversation_id === convId);
        const lastOutboundTime = Math.max(
          ...convOutbound.map((m) => new Date(m.created_at).getTime())
        );

        // Check for inbound replies within 24h
        const { data: replies } = await supabase
          .from("whatsapp_messages")
          .select("id, created_at, sentiment_score")
          .eq("conversation_id", convId)
          .eq("direction", "inbound")
          .gt("created_at", new Date(lastOutboundTime).toISOString())
          .lt("created_at", new Date(lastOutboundTime + 24 * 60 * 60 * 1000).toISOString())
          .order("created_at", { ascending: true })
          .limit(1);

        if (replies && replies.length > 0) {
          repliedCount++;
          const replyTime = new Date(replies[0].created_at).getTime();
          const responseTime = Math.round((replyTime - lastOutboundTime) / (1000 * 60)); // in minutes
          totalResponseTime += responseTime;
          responseCount++;

          // Track sentiment
          const sentiment = replies[0].sentiment_score;
          if (sentiment !== null) {
            if (sentiment >= 0.3) positiveSentiment++;
            else if (sentiment <= -0.3) negativeSentiment++;
          }
        }
      }

      const avgResponseTimeMinutes = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : null;

      // Get template ID from whatsapp_templates table
      const { data: template } = await supabase
        .from("whatsapp_templates")
        .select("id")
        .eq("template_name", tplName)
        .maybeSingle();

      // Upsert analytics record
      const analyticsData = {
        template_id: template?.id || null,
        template_name: tplName,
        date: targetDate,
        sent_count: sentCount,
        delivered_count: deliveredCount,
        read_count: readCount,
        replied_count: repliedCount,
        avg_response_time_minutes: avgResponseTimeMinutes,
        positive_sentiment_count: positiveSentiment,
        negative_sentiment_count: negativeSentiment,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("whatsapp_template_analytics")
        .upsert(analyticsData, {
          onConflict: "template_name,date",
        });

      results[tplName] = upsertError
        ? { error: upsertError.message }
        : {
            sentCount,
            deliveredCount,
            readCount,
            repliedCount,
            avgResponseTimeMinutes,
            positiveSentiment,
            negativeSentiment,
          };
    }

    console.log("Template analytics aggregation completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        date: targetDate,
        templatesProcessed: Object.keys(results).length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in aggregate-template-analytics:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
