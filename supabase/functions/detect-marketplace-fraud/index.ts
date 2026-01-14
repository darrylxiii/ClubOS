import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders } from "../_shared/cors-config.ts";

const corsHeaders = publicCorsHeaders;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, checkType } = await req.json();

    const signals: Array<{ type: string; severity: string; details: Record<string, unknown> }> = [];

    // Check for rapid proposals (more than 10 in 1 hour)
    if (checkType === "proposals" || !checkType) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("project_proposals")
        .select("*", { count: "exact", head: true })
        .eq("freelancer_id", userId)
        .gte("created_at", oneHourAgo);

      if (count && count > 10) {
        signals.push({
          type: "rapid_proposals",
          severity: count > 20 ? "high" : "medium",
          details: { count, period: "1 hour" },
        });
      }
    }

    // Check for duplicate proposal content
    if (checkType === "content" || !checkType) {
      const { data: proposals } = await supabase
        .from("project_proposals")
        .select("cover_letter")
        .eq("freelancer_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (proposals && proposals.length >= 3) {
        const letters = proposals.map((p) => p.cover_letter?.toLowerCase().trim());
        const duplicates = letters.filter((l, i) => letters.indexOf(l) !== i);
        if (duplicates.length >= 2) {
          signals.push({
            type: "duplicate_content",
            severity: "medium",
            details: { duplicateCount: duplicates.length },
          });
        }
      }
    }

    // Insert fraud signals if any detected
    if (signals.length > 0) {
      for (const signal of signals) {
        await supabase.from("marketplace_fraud_signals").insert({
          user_id: userId,
          signal_type: signal.type,
          severity: signal.severity,
          details: signal.details,
        });
      }

      console.log(`[FRAUD-DETECTION] Found ${signals.length} signals for user ${userId}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        signalsDetected: signals.length,
        signals 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[FRAUD-DETECTION] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
