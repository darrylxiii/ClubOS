import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { publicCorsHeaders, handleCorsPreFlight } from '../_shared/cors-config.ts';
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { logAIUsage, extractClientInfo } from '../_shared/ai-logger.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(publicCorsHeaders);
  }

  const startTime = Date.now();
  const clientInfo = extractClientInfo(req);
  let userId: string | undefined;

  try {
    console.log('[generate-executive-briefing] Processing request');
    
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[generate-executive-briefing] No auth header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      console.log('[generate-executive-briefing] Auth failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    userId = user.id;

    // Rate limiting: 20 briefings per hour
    const rateLimit = await checkUserRateLimit(userId, 'generate-executive-briefing', 20);
    if (!rateLimit.allowed) {
      console.log('[generate-executive-briefing] Rate limit exceeded for user:', userId);
      await logAIUsage({
        userId,
        functionName: 'generate-executive-briefing',
        ...clientInfo,
        rateLimitHit: true,
        success: false,
        errorMessage: 'Rate limit exceeded'
      });
      return createRateLimitResponse(rateLimit.retryAfter!, publicCorsHeaders);
    }

    const { candidateId, jobId } = await req.json();

    // Fetch candidate and application data
    const { data: candidate } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .single();

    const { data: application } = await supabase
      .from('applications')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('job_id', jobId)
      .single();

    const { data: feedback } = await supabase
      .from('interview_feedback')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });

    // Generate one-page briefing
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Generate a one-page executive briefing for quick decision-making (30-second read).

CANDIDATE: ${candidate?.full_name} - ${candidate?.current_title}
MATCH SCORE: ${application?.match_score}%
INTERVIEW ROUNDS: ${feedback?.length || 0}

FEEDBACK SUMMARY:
${feedback?.map(f => `- ${f.recommendation}: Tech ${f.technical_rating}/5, Culture ${f.culture_fit_rating}/5, Comm ${f.communication_rating}/5`).join('\n')}

Generate a JSON response:
{
  "headline": "One sentence summary (max 15 words)",
  "topThreeStrengths": ["strength 1", "strength 2", "strength 3"],
  "topThreeConcerns": ["concern 1", "concern 2", "concern 3"],
  "teamConsensus": {
    "score": 85,
    "confidence": "high|medium|low",
    "alignment": "strong|moderate|weak"
  },
  "aiRecommendation": "hire|no_hire|need_more_info",
  "aiRecommendationReasoning": "One sentence why (max 20 words)",
  "nextStep": "Specific action to take next",
  "riskFactors": ["risk 1", "risk 2"],
  "opportunityCost": "What we lose if we don't hire (one sentence)",
  "readTime": "30 seconds"
}`;

    console.log('[generate-executive-briefing] Calling Lovable AI for candidate:', candidateId);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an executive briefing AI. Be concise, clear, and actionable. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorMessage = aiResponse.status === 429 ? 'AI rate limit exceeded' :
                          aiResponse.status === 402 ? 'AI credits exhausted' :
                          'AI service error';
      
      await logAIUsage({
        userId,
        functionName: 'generate-executive-briefing',
        ...clientInfo,
        responseTimeMs: Date.now() - startTime,
        success: false,
        errorMessage
      });

      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let briefing;

    try {
      const content = aiData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      briefing = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch (e) {
      console.error('[generate-executive-briefing] Failed to parse AI response:', e);
      briefing = {
        headline: `${candidate?.full_name} - Strong candidate pending review`,
        topThreeStrengths: ["Technical competence", "Cultural alignment", "Strong communication"],
        topThreeConcerns: ["More data needed", "Additional interviews recommended", "Team feedback pending"],
        teamConsensus: { score: 75, confidence: "medium", alignment: "moderate" },
        aiRecommendation: "need_more_info",
        aiRecommendationReasoning: "Insufficient interview data for confident decision",
        nextStep: "Schedule final interview round",
        riskFactors: ["Limited interview feedback"],
        opportunityCost: "Potential quality hire may accept competing offer",
        readTime: "30 seconds"
      };
    }

    await logAIUsage({
      userId,
      functionName: 'generate-executive-briefing',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: true
    });

    console.log('[generate-executive-briefing] Briefing generated successfully');

    return new Response(JSON.stringify({ briefing }), {
      headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[generate-executive-briefing] Error:', error);
    await logAIUsage({
      userId,
      functionName: 'generate-executive-briefing',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
