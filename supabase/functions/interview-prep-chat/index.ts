import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { verifyRecaptcha, createRecaptchaErrorResponse } from '../_shared/recaptcha-verifier.ts';
import { logAIUsage, extractClientInfo } from '../_shared/ai-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const clientInfo = extractClientInfo(req);
  let userId: string | undefined;

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      await logAIUsage({
        functionName: 'interview-prep-chat',
        ...clientInfo,
        success: false,
        errorMessage: 'No authorization header'
      });
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      await logAIUsage({
        functionName: 'interview-prep-chat',
        ...clientInfo,
        success: false,
        errorMessage: 'Authentication failed'
      });
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    userId = user.id;

    // Rate limiting: 12 requests per hour
    const rateLimit = await checkUserRateLimit(userId, 'interview-prep-chat', 12);
    if (!rateLimit.allowed) {
      await logAIUsage({
        userId,
        functionName: 'interview-prep-chat',
        ...clientInfo,
        rateLimitHit: true,
        success: false,
        errorMessage: 'Rate limit exceeded'
      });
      return createRateLimitResponse(rateLimit.retryAfter!, corsHeaders);
    }
    const { messages, companyInfo, roleInfo, stage, recaptchaToken } = await req.json();

    // reCAPTCHA verification
    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'interview_prep', 0.5);
      if (!recaptchaResult.success) {
        await logAIUsage({
          userId,
          functionName: 'interview-prep-chat',
          ...clientInfo,
          recaptchaScore: recaptchaResult.score,
          recaptchaPassed: false,
          success: false,
          errorMessage: 'reCAPTCHA verification failed'
        });
        return createRecaptchaErrorResponse(recaptchaResult, corsHeaders);
      }
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build context-aware system prompt
    const systemPrompt = `You are an expert interviewer conducting a ${stage || 'general'} interview for the position of ${roleInfo?.position || 'a role'} at ${companyInfo?.company_name || 'the company'}.

COMPANY CONTEXT:
${companyInfo ? `
- Company: ${companyInfo.company_name}
- Industry: ${companyInfo.industry || 'Not specified'}
- Size: ${companyInfo.company_size || 'Not specified'}
- Description: ${companyInfo.description || 'Not specified'}
- Values: ${companyInfo.values ? JSON.stringify(companyInfo.values) : 'Not specified'}
- Tech Stack: ${companyInfo.tech_stack ? JSON.stringify(companyInfo.tech_stack) : 'Not specified'}
` : 'No specific company information provided.'}

ROLE CONTEXT:
${roleInfo ? `
- Position: ${roleInfo.position}
- Required Skills: ${roleInfo.required_skills ? JSON.stringify(roleInfo.required_skills) : 'Not specified'}
- Experience Level: ${roleInfo.experience_level || 'Not specified'}
- Location: ${roleInfo.location || 'Not specified'}
- Job Description: ${roleInfo.description || 'Not specified'}
` : 'No specific role information provided.'}

INTERVIEW STAGE: ${stage || 'General Interview'}

YOUR ROLE:
- Ask relevant questions appropriate for this stage and role
- Provide constructive feedback when asked
- Be professional but conversational
- Probe deeper into answers when appropriate
- Challenge the candidate respectfully
- Focus on skills, experience, and cultural fit relevant to the company and role
- Adapt your questions based on the candidate's responses

Keep responses concise and focused. Ask one question at a time. Begin by introducing yourself and explaining what to expect in this interview stage.`;

    console.log('Calling Lovable AI for interview prep chat');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorMessage = response.status === 429 ? 'AI rate limit exceeded' :
                          response.status === 402 ? 'AI credits exhausted' :
                          'AI service error';
      await logAIUsage({
        userId,
        functionName: 'interview-prep-chat',
        ...clientInfo,
        responseTimeMs: Date.now() - startTime,
        success: false,
        errorMessage
      });

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    await logAIUsage({
      userId,
      functionName: 'interview-prep-chat',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: true
    });

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Error in interview-prep-chat:', error);
    await logAIUsage({
      userId,
      functionName: 'interview-prep-chat',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
