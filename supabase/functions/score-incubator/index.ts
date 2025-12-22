import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { publicCorsHeaders, handleCorsPreFlight } from '../_shared/cors-config.ts';
import { logAIUsage, extractClientInfo } from '../_shared/ai-logger.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(publicCorsHeaders);
  }

  const startTime = Date.now();
  const clientInfo = extractClientInfo(req);
  let userId: string | undefined;

  try {
    console.log('[score-incubator] Processing request');

    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing sessionId' }),
        { status: 400, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch session data
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('incubator_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error(`Session not found: ${sessionError?.message}`);
    }

    userId = session.user_id;
    const scenario = JSON.parse(session.scenario_seed || '{}');
    const finalPlan = session.final_plan || {};
    const frameAnswers = {
      problem: session.frame_problem,
      customer: session.frame_customer,
      successMetric: session.frame_success_metric
    };

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('[score-incubator] Calling Lovable AI for scoring');

    const systemPrompt = `You are an expert venture capitalist and startup strategist. 
Your task is to score a candidate's "Incubator:20" assessment.
In this assessment, the candidate was given a challenging startup scenario and had 20 minutes to frame the problem and build a 6-part execution plan.

RUBRIC (0-10 for each):
1. Strategic Clarity: Does the solution actually solve the core problem described in the scenario?
2. Customer Empathy: Did they identify the right target customer and their pain points?
3. Execution Feasibility: Is the plan realistic given the budget and constraints?
4. Unit Economics: Is the business model sound?
5. GTM Strategy: Is the distribution plan effective?
6. Risk Awareness: Did they identify the most critical risks and how to mitigate them?

SCENARIO:
Title: ${scenario.title}
Industry: ${scenario.industry}
Target Customer: ${scenario.customer}
Constraint: ${scenario.constraint}
Budget: €${scenario.budget}
Twist: ${scenario.twist}

CANDIDATE WORK:
FRAME STAGE:
- Problem: ${frameAnswers.problem}
- Customer: ${frameAnswers.customer}
- Success Metric: ${frameAnswers.successMetric}

EXECUTION PLAN STAGE:
- Problem Definition: ${finalPlan.problem}
- Solution: ${finalPlan.solution}
- GTM: ${finalPlan.gtm}
- Unit Economics: ${finalPlan.unitEconomics}
- Execution Plan: ${finalPlan.executionPlan}
- Risks: ${finalPlan.risks}

RESPOND IN JSON ONLY:
{
  "scores": {
    "strategic_clarity": number,
    "customer_empathy": number,
    "execution_feasibility": number,
    "unit_economics": number,
    "gtm_strategy": number,
    "risk_awareness": number
  },
  "overall_score": number (0-10),
  "feedback": "200-300 word detailed constructive feedback as a VC",
  "archetype": "Growth Hustler | Product Purist | Unit Economics Obsessive | Scrappy Founder",
  "top_strengths": ["string"],
  "growth_areas": ["string"]
}
`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Please score the candidate work provided in the system prompt.' }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const result = JSON.parse(aiData.choices?.[0]?.message?.content || '{}');

    if (!result.scores) {
      throw new Error('Incomplete scoring result from AI');
    }

    // Update assessment result
    if (session.assessment_result_id) {
      const { error: updateError } = await supabaseAdmin
        .from('assessment_results')
        .update({
          score: result.overall_score * 10, // Normalize to 0-100
          results_data: {
            ...result,
            scenario,
            frameAnswers,
            finalPlan
          }
        })
        .eq('id', session.assessment_result_id);

      if (updateError) throw updateError;
    }

    // Update session
    await supabaseAdmin
      .from('incubator_sessions')
      .update({
        total_score: result.overall_score,
        normalized_score: result.overall_score * 10
      })
      .eq('id', sessionId);

    await logAIUsage({
      userId,
      functionName: 'score-incubator',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: true
    });

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[score-incubator] Error:', error);
    await logAIUsage({
      userId,
      functionName: 'score-incubator',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
