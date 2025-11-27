import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ScoringInput {
  sessionId: string;
}

interface PlanSection {
  problem?: string;
  solution?: string;
  gtm?: string;
  unitEconomics?: string;
  executionPlan?: string;
  risks?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { sessionId }: ScoringInput = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch session data
    const { data: session, error: sessionError } = await supabaseClient
      .from("incubator_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "Session not found", details: sessionError }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch actions for AI collaboration scoring
    const { data: actions } = await supabaseClient
      .from("incubator_actions")
      .select("*")
      .eq("session_id", sessionId)
      .order("timestamp_ms", { ascending: true });

    // Calculate Plan Quality Score (0-100)
    const planQualityScore = calculatePlanQuality(
      session.final_plan as PlanSection | null,
      session.word_count || 0,
      session.frame_problem,
      session.frame_customer,
      session.frame_success_metric
    );

    // Calculate AI Collaboration Score (0-100)
    const aiCollabScore = calculateAICollaborationScore(actions || []);

    // Calculate Communication Score (0-100)
    const communicationScore = calculateCommunicationScore(
      session.word_count || 0,
      session.voice_rationale_url ? 1 : 0,
      session.frame_problem,
      session.frame_customer,
      session.frame_success_metric
    );

    // Calculate Total Score (weighted average)
    const totalScore = Math.round(
      planQualityScore * 0.5 + // 50% weight on plan quality
      aiCollabScore * 0.3 + // 30% weight on AI collaboration
      communicationScore * 0.2 // 20% weight on communication
    );

    // Normalize to 0-100 scale (already in that range, but ensure)
    const normalizedScore = Math.min(100, Math.max(0, totalScore));

    // Generate capability vector for role matching
    const capabilityVector = generateCapabilityVector(
      session.final_plan as PlanSection | null,
      actions || [],
      planQualityScore,
      aiCollabScore
    );

    // Update session with scores
    const { error: updateError } = await supabaseClient
      .from("incubator_sessions")
      .update({
        plan_quality_score: planQualityScore,
        ai_collab_score: aiCollabScore,
        communication_score: communicationScore,
        total_score: totalScore,
        normalized_score: normalizedScore,
        capability_vector: capabilityVector,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("Error updating session scores:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update scores", details: updateError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update assessment result if linked
    if (session.assessment_result_id) {
      await supabaseClient
        .from("assessment_results")
        .update({
          score: normalizedScore,
          results_data: {
            ...(session.results_data || {}),
            scores: {
              planQuality: planQualityScore,
              aiCollaboration: aiCollabScore,
              communication: communicationScore,
              total: totalScore,
              normalized: normalizedScore,
            },
            capabilityVector,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.assessment_result_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        scores: {
          planQuality: planQualityScore,
          aiCollaboration: aiCollabScore,
          communication: communicationScore,
          total: totalScore,
          normalized: normalizedScore,
        },
        capabilityVector,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error scoring incubator assessment:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: "Internal server error", details: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Calculate plan quality score based on completeness and coherence
 */
function calculatePlanQuality(
  plan: PlanSection | null,
  wordCount: number,
  frameProblem?: string | null,
  frameCustomer?: string | null,
  frameSuccessMetric?: string | null
): number {
  if (!plan) return 0;

  let score = 0;
  let maxScore = 0;

  // Frame quality (30 points)
  maxScore += 30;
  if (frameProblem && frameProblem.trim().length > 20) score += 10;
  if (frameCustomer && frameCustomer.trim().length > 20) score += 10;
  if (frameSuccessMetric && frameSuccessMetric.trim().length > 15) score += 10;

  // Plan section completeness (50 points)
  const sections = ["problem", "solution", "gtm", "unitEconomics", "executionPlan", "risks"];
  maxScore += 50;
  sections.forEach((section) => {
    const content = plan[section as keyof PlanSection];
    if (content && typeof content === "string" && content.trim().length > 50) {
      score += 8.33; // ~8.33 points per section
    }
  });

  // Word count adequacy (20 points)
  // Ideal range: 500-2000 words
  maxScore += 20;
  if (wordCount >= 500 && wordCount <= 2000) {
    score += 20;
  } else if (wordCount >= 300 && wordCount < 500) {
    score += 15; // Slightly under
  } else if (wordCount > 2000 && wordCount <= 3000) {
    score += 15; // Slightly over
  } else if (wordCount >= 200 && wordCount < 300) {
    score += 10; // Too brief
  } else if (wordCount > 3000) {
    score += 10; // Too verbose
  } else if (wordCount > 0) {
    score += 5; // Minimal content
  }

  return Math.round((score / maxScore) * 100);
}

/**
 * Calculate AI collaboration score based on tool usage and interaction quality
 */
function calculateAICollaborationScore(actions: any[]): number {
  if (!actions || actions.length === 0) return 0;

  let score = 0;
  let maxScore = 0;

  // Tool usage diversity (30 points)
  maxScore += 30;
  const toolTypes = new Set(
    actions
      .filter((a) => a.tool_used)
      .map((a) => a.tool_used)
  );
  const uniqueTools = toolTypes.size;
  if (uniqueTools >= 3) score += 30;
  else if (uniqueTools === 2) score += 20;
  else if (uniqueTools === 1) score += 10;

  // AI interaction frequency (25 points)
  maxScore += 25;
  const aiInteractions = actions.filter(
    (a) => a.action_type === "PROMPT" || a.tool_used
  ).length;
  if (aiInteractions >= 10) score += 25;
  else if (aiInteractions >= 5) score += 20;
  else if (aiInteractions >= 3) score += 15;
  else if (aiInteractions >= 1) score += 10;

  // Response quality (25 points) - based on acceptance rate
  maxScore += 25;
  const aiResponses = actions.filter((a) => a.ai_response).length;
  const acceptedResponses = actions.filter(
    (a) => a.response_action === "accept"
  ).length;
  if (aiResponses > 0) {
    const acceptanceRate = acceptedResponses / aiResponses;
    score += Math.round(acceptanceRate * 25);
  }

  // Edit and refinement (20 points)
  maxScore += 20;
  const edits = actions.filter((a) => a.action_type === "EDIT").length;
  if (edits >= 5) score += 20;
  else if (edits >= 3) score += 15;
  else if (edits >= 1) score += 10;

  return Math.round((score / maxScore) * 100);
}

/**
 * Calculate communication score based on clarity and completeness
 */
function calculateCommunicationScore(
  wordCount: number,
  hasVoiceRationale: number,
  frameProblem?: string | null,
  frameCustomer?: string | null,
  frameSuccessMetric?: string | null
): number {
  let score = 0;
  let maxScore = 0;

  // Frame clarity (40 points)
  maxScore += 40;
  if (frameProblem && frameProblem.trim().length > 30) score += 13;
  if (frameCustomer && frameCustomer.trim().length > 30) score += 13;
  if (frameSuccessMetric && frameSuccessMetric.trim().length > 20) score += 14;

  // Content adequacy (40 points)
  maxScore += 40;
  if (wordCount >= 500 && wordCount <= 2000) {
    score += 40;
  } else if (wordCount >= 300 && wordCount < 500) {
    score += 30;
  } else if (wordCount >= 200 && wordCount < 300) {
    score += 20;
  } else if (wordCount > 0) {
    score += 10;
  }

  // Voice rationale bonus (20 points)
  maxScore += 20;
  if (hasVoiceRationale) {
    score += 20; // Bonus for providing voice rationale
  }

  return Math.round((score / maxScore) * 100);
}

/**
 * Generate capability vector for role matching
 */
function generateCapabilityVector(
  plan: PlanSection | null,
  actions: any[],
  planQuality: number,
  aiCollab: number
): Record<string, number> {
  const vector: Record<string, number> = {
    strategic_thinking: 0,
    execution_planning: 0,
    market_analysis: 0,
    financial_acumen: 0,
    risk_management: 0,
    ai_collaboration: 0,
    communication: 0,
  };

  if (!plan) return vector;

  // Strategic thinking (based on problem framing and solution quality)
  if (plan.problem && plan.solution) {
    vector.strategic_thinking = Math.min(100, planQuality * 0.4);
  }

  // Execution planning (based on execution plan section)
  if (plan.executionPlan) {
    vector.execution_planning = Math.min(100, planQuality * 0.3);
  }

  // Market analysis (based on GTM section)
  if (plan.gtm) {
    vector.market_analysis = Math.min(100, planQuality * 0.25);
  }

  // Financial acumen (based on unit economics)
  if (plan.unitEconomics) {
    vector.financial_acumen = Math.min(100, planQuality * 0.3);
  }

  // Risk management (based on risks section)
  if (plan.risks) {
    vector.risk_management = Math.min(100, planQuality * 0.25);
  }

  // AI collaboration (direct score)
  vector.ai_collaboration = aiCollab;

  // Communication (based on word count and structure)
  const wordCount = Object.values(plan).reduce(
    (sum, section) => sum + (typeof section === "string" ? section.length : 0),
    0
  );
  vector.communication = Math.min(100, Math.max(0, (wordCount / 20) * 10));

  return vector;
}


