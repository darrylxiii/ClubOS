import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { verifyRecaptcha, createRecaptchaErrorResponse } from '../_shared/recaptcha-verifier.ts';
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { getCorsHeaders, handleCorsPreFlight } from '../_shared/cors-config.ts';
import { createFunctionLogger, getClientInfo } from '../_shared/function-logger.ts';

serve(async (req) => {
  const logger = createFunctionLogger('incubator-ai-chat');
  const corsHeaders = getCorsHeaders(req, false); // Public endpoint but with rate limiting
  
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight(corsHeaders);
  }

  try {
    const clientInfo = getClientInfo(req);
    logger.logRequest(req.method, undefined, { ip: clientInfo.ip });
    
    // Phase 2: Add rate limiting to prevent abuse (20 requests per hour per IP)
    const rateLimitResult = await checkUserRateLimit(clientInfo.ip, 'incubator-ai-chat', 20);
    if (!rateLimitResult.allowed) {
      logger.logRateLimit(clientInfo.ip);
      return createRateLimitResponse(rateLimitResult.retryAfter || 3600, corsHeaders);
    }
    
    // Initialize Supabase client with service role for rate limiting and logging
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify reCAPTCHA token
    const recaptchaToken = req.headers.get('x-recaptcha-token');
    if (!recaptchaToken) {
      logger.warn('Missing reCAPTCHA token');
      return new Response(
        JSON.stringify({ error: 'reCAPTCHA verification required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'incubator_chat', 0.5);
    if (!recaptchaResult.success) {
      logger.warn('reCAPTCHA verification failed', { error: recaptchaResult.error });
      await supabaseClient.from('ai_usage_logs').insert({
        function_name: 'incubator-ai-chat',
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        recaptcha_score: recaptchaResult.score,
        recaptcha_passed: false,
        success: false,
        error_message: 'reCAPTCHA verification failed'
      });
      return createRecaptchaErrorResponse(recaptchaResult, corsHeaders);
    }

    logger.info('reCAPTCHA verified', { score: recaptchaResult.score });
    logger.checkpoint('recaptcha_verified');

    // Check IP-based rate limits (5 requests per 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentRequests, error: rateLimitError } = await supabaseClient
      .from('ai_usage_logs')
      .select('id')
      .eq('function_name', 'incubator-ai-chat')
      .eq('ip_address', clientInfo.ip)
      .gte('created_at', fifteenMinutesAgo);

    if (rateLimitError) {
      logger.warn('Rate limit check error', { error: rateLimitError.message });
    }

    if (recentRequests && recentRequests.length >= 5) {
      logger.logRateLimit(clientInfo.ip);
      await supabaseClient.from('ai_usage_logs').insert({
        function_name: 'incubator-ai-chat',
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        recaptcha_score: recaptchaResult.score,
        recaptcha_passed: true,
        rate_limit_hit: true,
        success: false,
        error_message: 'Rate limit exceeded'
      });
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again in 15 minutes.',
          retryAfter: 900 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '900'
          } 
        }
      );
    }

    const { messages, scenario, frameAnswers } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    logger.info('Request received', {
      messageCount: messages?.length,
      hasScenario: !!scenario,
      hasFrameAnswers: !!frameAnswers,
      recaptchaScore: recaptchaResult.score
    });

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      logger.warn('Invalid messages array');
      return new Response(
        JSON.stringify({ error: "Invalid request: messages array is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!scenario) {
      logger.warn('Missing scenario context');
      return new Response(
        JSON.stringify({ error: "Invalid request: scenario context is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!LOVABLE_API_KEY) {
      logger.error('LOVABLE_API_KEY not configured');
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    logger.checkpoint('validated_input');

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

    logger.info('Calling Lovable AI Gateway');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const aiStartTime = Date.now();
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
    logger.logExternalCall('lovable-ai', '/v1/chat/completions', response.status, Date.now() - aiStartTime);

    // Log successful request
    await supabaseClient.from('ai_usage_logs').insert({
      function_name: 'incubator-ai-chat',
      ip_address: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      recaptcha_score: recaptchaResult.score,
      recaptcha_passed: true,
      rate_limit_hit: false,
      success: response.ok,
      tokens_used: messages.reduce((acc: number, msg: any) => acc + (msg.content?.length || 0), 0)
    });

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
      logger.error('AI gateway error', undefined, { status: response.status, error: errorText });
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    logger.logSuccess(200);

    // Return the streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.logError(500, errorMessage);
    
    // Log error
    try {
      const clientInfo = getClientInfo(req);
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await supabaseClient.from('ai_usage_logs').insert({
        function_name: 'incubator-ai-chat',
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        success: false,
        error_message: errorMessage
      });
    } catch (logError) {
      logger.warn('Failed to log error', { error: String(logError) });
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
