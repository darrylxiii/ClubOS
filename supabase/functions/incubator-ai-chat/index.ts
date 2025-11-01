import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, scenario, frameAnswers } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    console.log('[Incubator AI] Request received:', {
      messageCount: messages?.length,
      hasScenario: !!scenario,
      hasFrameAnswers: !!frameAnswers,
      timestamp: new Date().toISOString(),
    });

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('[Incubator AI] Invalid messages array');
      return new Response(
        JSON.stringify({ error: "Invalid request: messages array is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!scenario) {
      console.error('[Incubator AI] Missing scenario context');
      return new Response(
        JSON.stringify({ error: "Invalid request: scenario context is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error('[Incubator AI] LOVABLE_API_KEY not configured');
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context-aware system prompt
    const systemPrompt = `You are an expert business strategy advisor helping someone build a startup one-pager for the Incubator:20 assessment.

SCENARIO CONTEXT:
- Industry: ${scenario.industry}
- Customer: ${scenario.customer}
- Budget: $${scenario.budget.toLocaleString()} for 12 weeks
- Stage: ${scenario.stage}
- Region: ${scenario.region}
- Constraint: ${scenario.constraint}
- Market Twist: ${scenario.twist}

${frameAnswers ? `STRATEGIC FRAMEWORK:
- Problem: ${frameAnswers.problem}
- Customer ICP: ${frameAnswers.customer}
- Success Metric: ${frameAnswers.successMetric}` : ''}

YOUR ROLE:
- Provide specific, actionable advice tailored to THIS scenario
- Help with calculations (unit economics, payback periods, market sizing)
- Suggest GTM strategies that fit the constraints
- Challenge assumptions constructively
- Be concise but thorough (2-4 paragraphs max)
- Always tie advice back to their specific scenario

TOOLS YOU CAN HELP WITH:
- Unit economics calculations (price, COGS, gross margin, CAC, payback)
- Market sizing (TAM/SAM/SOM estimation)
- GTM strategy options and trade-offs
- Budget allocation for 12-week plan
- Risk assessment and mitigation tests
- Counter-arguments to strengthen their plan

Be specific with numbers when possible. Reference their constraints and twist in your advice.`;

    console.log('[Incubator AI] Calling Lovable AI Gateway...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log('[Incubator AI] AI Gateway response status:', response.status);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded. Please try again in a moment." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add funds to continue." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return the streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Incubator AI chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
