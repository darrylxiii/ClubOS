import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { verifyRecaptcha, createRecaptchaErrorResponse } from '../_shared/recaptcha-verifier.ts';
import { logAIUsage, extractClientInfo } from '../_shared/ai-logger.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
  const { user, corsHeaders } = ctx;

  const startTime = Date.now();
  const clientInfo = extractClientInfo(req);
  const userId = user.id;

  try {

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
    
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not configured');
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

    console.log('Calling Google Gemini for interview prep chat');
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOOGLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorMessage = response.status === 429 ? 'AI rate limit exceeded' :
                          response.status === 402 ? 'AI quota exceeded' :
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
        return new Response(JSON.stringify({ error: 'AI quota exceeded. Please check your Google API billing.' }), {
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
}));
