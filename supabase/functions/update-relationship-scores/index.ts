import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entity_type, entity_id, batch_mode, limit = 50 } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: any[] = [];

    if (batch_mode) {
      // Process entities that need score updates
      // Get candidates with recent communications
      const { data: recentComms } = await supabase
        .from("unified_communications")
        .select("candidate_id, company_id")
        .gte("occurred_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .not("candidate_id", "is", null)
        .limit(limit);

      const processedIds = new Set<string>();

      for (const comm of recentComms || []) {
        if (comm.candidate_id && !processedIds.has(`candidate-${comm.candidate_id}`)) {
          processedIds.add(`candidate-${comm.candidate_id}`);
          const result = await updateEntityScore(supabase, "candidate", comm.candidate_id);
          results.push(result);
        }
        if (comm.company_id && !processedIds.has(`company-${comm.company_id}`)) {
          processedIds.add(`company-${comm.company_id}`);
          const result = await updateEntityScore(supabase, "company", comm.company_id);
          results.push(result);
        }
      }

      return new Response(JSON.stringify({ 
        processed: results.length, 
        results 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single entity update
    if (!entity_type || !entity_id) {
      throw new Error("entity_type and entity_id required");
    }

    const result = await updateEntityScore(supabase, entity_type, entity_id);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("update-relationship-scores error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updateEntityScore(supabase: any, entityType: string, entityId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Fetch all communications for this entity
  const column = entityType === "candidate" ? "candidate_id" : "company_id";
  
  const { data: communications } = await supabase
    .from("unified_communications")
    .select("*")
    .eq(column, entityId)
    .gte("occurred_at", ninetyDaysAgo.toISOString())
    .order("occurred_at", { ascending: false });

  if (!communications || communications.length === 0) {
    // No communications - critical risk
    await upsertScore(supabase, entityType, entityId, {
      health_score: 0,
      risk_level: "critical",
      days_since_contact: 999,
      total_communications: 0,
      sentiment_trend: 0,
      response_rate: 0,
      channel_diversity: 0,
    });
    return { entity_type: entityType, entity_id: entityId, risk_level: "critical" };
  }

  // Calculate metrics
  const lastContact = new Date(communications[0].occurred_at);
  const daysSinceContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));

  const recentComms = communications.filter((c: any) => 
    new Date(c.occurred_at) >= thirtyDaysAgo
  );

  // Sentiment analysis
  const sentiments = communications
    .filter((c: any) => c.sentiment_score !== null)
    .map((c: any) => c.sentiment_score);
  
  const avgSentiment = sentiments.length > 0 
    ? sentiments.reduce((a: number, b: number) => a + b, 0) / sentiments.length 
    : 0;

  // Sentiment trend (recent vs older)
  const recentSentiments = recentComms
    .filter((c: any) => c.sentiment_score !== null)
    .map((c: any) => c.sentiment_score);
  const olderSentiments = communications
    .filter((c: any) => new Date(c.occurred_at) < thirtyDaysAgo && c.sentiment_score !== null)
    .map((c: any) => c.sentiment_score);
  
  let sentimentTrend = 0;
  if (recentSentiments.length > 0 && olderSentiments.length > 0) {
    const recentAvg = recentSentiments.reduce((a: number, b: number) => a + b, 0) / recentSentiments.length;
    const olderAvg = olderSentiments.reduce((a: number, b: number) => a + b, 0) / olderSentiments.length;
    sentimentTrend = recentAvg - olderAvg;
  }

  // Response rate (inbound that have subsequent outbound)
  const inboundComms = communications.filter((c: any) => c.direction === "inbound");
  const outboundComms = communications.filter((c: any) => c.direction === "outbound");
  const responseRate = inboundComms.length > 0 
    ? Math.min(outboundComms.length / inboundComms.length, 1) 
    : (outboundComms.length > 0 ? 1 : 0);

  // Channel diversity
  const channels = new Set(communications.map((c: any) => c.source));
  const channelDiversity = channels.size / 6; // Normalize by expected max channels

  // Calculate health score (0-100)
  let healthScore = 50; // Base score

  // Days since contact impact (-30 to +20)
  if (daysSinceContact <= 3) healthScore += 20;
  else if (daysSinceContact <= 7) healthScore += 15;
  else if (daysSinceContact <= 14) healthScore += 10;
  else if (daysSinceContact <= 30) healthScore += 0;
  else if (daysSinceContact <= 60) healthScore -= 15;
  else healthScore -= 30;

  // Sentiment impact (-15 to +15)
  healthScore += avgSentiment * 15;

  // Sentiment trend impact (-10 to +10)
  healthScore += sentimentTrend * 10;

  // Response rate impact (0 to +10)
  healthScore += responseRate * 10;

  // Communication volume impact (0 to +5)
  healthScore += Math.min(recentComms.length / 10, 1) * 5;

  // Channel diversity impact (0 to +5)
  healthScore += channelDiversity * 5;

  // Clamp to 0-100
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

  // Determine risk level
  let riskLevel: string;
  if (healthScore >= 70) riskLevel = "low";
  else if (healthScore >= 50) riskLevel = "medium";
  else if (healthScore >= 30) riskLevel = "high";
  else riskLevel = "critical";

  // Override risk if very old contact
  if (daysSinceContact > 60) riskLevel = "critical";
  else if (daysSinceContact > 30 && riskLevel === "low") riskLevel = "medium";

  const scoreData = {
    health_score: healthScore,
    risk_level: riskLevel,
    days_since_contact: daysSinceContact,
    total_communications: communications.length,
    recent_communications: recentComms.length,
    sentiment_trend: Math.round(sentimentTrend * 100) / 100,
    avg_sentiment: Math.round(avgSentiment * 100) / 100,
    response_rate: Math.round(responseRate * 100) / 100,
    channel_diversity: channels.size,
    channels_used: Array.from(channels),
    last_contact_at: lastContact.toISOString(),
  };

  await upsertScore(supabase, entityType, entityId, scoreData);

  return { 
    entity_type: entityType, 
    entity_id: entityId, 
    ...scoreData 
  };
}

async function upsertScore(supabase: any, entityType: string, entityId: string, data: any) {
  const { error } = await supabase
    .from("communication_relationship_scores")
    .upsert({
      entity_type: entityType,
      entity_id: entityId,
      ...data,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "entity_type,entity_id"
    });

  if (error) {
    console.error("Failed to upsert relationship score:", error);
    throw error;
  }
}
