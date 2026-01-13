import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { verifyRecaptcha, createRecaptchaErrorResponse } from '../_shared/recaptcha-verifier.ts';
import { logAIUsage, extractClientInfo } from '../_shared/ai-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  jobId: z.string().min(1),
  userId: z.string().min(1),
  jobTitle: z.string().min(1, 'Job title is required').max(500),
  company: z.string().min(1, 'Company is required').max(500),
  tags: z.array(z.string()).optional().default([]),
  test_mode: z.boolean().optional().default(false),
  test_profile: z.object({
    current_title: z.string().optional(),
    location: z.string().optional(),
    career_preferences: z.string().optional(),
    employment_type_preference: z.string().optional(),
    remote_work_preference: z.boolean().optional(),
    desired_salary_min: z.number().optional(),
    desired_salary_max: z.number().optional(),
  }).optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const clientInfo = extractClientInfo(req);
  let userId: string | undefined;

  try {
    // Validate authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create auth client to verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('[Auth] Invalid token:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Parse and validate request body
    const rawBody = await req.json();
    const validationResult = requestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error('[Validation] Invalid request parameters:', validationResult.error.issues);
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { jobId, jobTitle, company, tags, userId: requestUserId, test_mode, test_profile } = validationResult.data;
    
    // Verify userId matches authenticated user (unless admin)
    if (requestUserId !== user.id && !test_mode) {
      console.error('[Auth] User ID mismatch:', { requested: requestUserId, authenticated: user.id });
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Cannot calculate score for another user' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      );
    }

    userId = user.id;
    console.log('[Auth] Authenticated user:', userId);

    // Rate limiting: 7 requests per hour
    const rateLimit = await checkUserRateLimit(userId, 'calculate-match-score', 7);
    if (!rateLimit.allowed) {
      await logAIUsage({
        userId,
        functionName: 'calculate-match-score',
        ...clientInfo,
        rateLimitHit: true,
        success: false,
        errorMessage: 'Rate limit exceeded'
      });
      return createRateLimitResponse(rateLimit.retryAfter!, corsHeaders);
    }

    console.log('Calculating match score for:', { jobId, jobTitle, company, userId });

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use service client only for privileged writes
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user profile or use test data
    let profile;
    if (test_mode) {
      // Use mock profile data in test mode
      profile = test_profile || {
        current_title: 'Test Candidate',
        location: 'Not specified',
        career_preferences: 'Not specified',
        employment_type_preference: 'Not specified',
        remote_work_preference: false,
        desired_salary_min: null,
        desired_salary_max: null,
      };
      console.log('[Test Mode] Using mock profile data');
    } else {
      // Fetch real profile from database
      const { data: fetchedProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw new Error('Failed to fetch user profile');
      }
      profile = fetchedProfile;
    }

    // Construct AI prompt
    const prompt = `Analyze this job match and provide a detailed breakdown:

JOB DETAILS:
- Title: ${jobTitle}
- Company: ${company}
- Tags/Skills: ${tags.join(', ')}

CANDIDATE PROFILE:
- Current Title: ${profile.current_title || 'Not specified'}
- Location: ${profile.location || 'Not specified'}
- Career Preferences: ${profile.career_preferences || 'Not specified'}
- Employment Preference: ${profile.employment_type_preference || 'Not specified'}
- Remote Preference: ${profile.remote_work_preference ? 'Yes' : 'No'}
- Desired Salary: ${profile.desired_salary_min && profile.desired_salary_max ? `$${profile.desired_salary_min}-$${profile.desired_salary_max}` : 'Not specified'}

Provide a JSON response with this exact structure:
{
  "overall_score": <number 0-100>,
  "required_criteria_met": [
    {"criterion": "string", "met": true/false}
  ],
  "required_criteria_total": <number>,
  "preferred_criteria_met": [
    {"criterion": "string", "met": true/false}
  ],
  "preferred_criteria_total": <number>,
  "club_match_factors": [
    {"factor": "string", "score": <number 0-10>, "description": "string"}
  ],
  "club_match_score": <number 0-100>,
  "additional_factors": [
    {"factor": "string", "impact": "positive/negative/neutral", "description": "string"}
  ],
  "gaps": [
    {"gap": "string", "impact": "string (e.g., -3% match score)"}
  ],
  "hard_stops": [
    {"issue": "string", "description": "string"}
  ],
  "quick_wins": [
    {"action": "string", "timeframe": "string (e.g., 1-2 weeks)", "impact": "string (e.g., +2% match)"}
  ],
  "longer_term_actions": [
    {"action": "string", "timeframe": "string (e.g., 4-6 months)", "impact": "string (e.g., +5% match)"}
  ]
}

Be specific and realistic. Timeframes should match the actual effort needed (e.g., "3 days", "2 weeks", "8 months", etc.).`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a career matching expert. Analyze job-candidate matches and provide detailed, actionable breakdowns in JSON format.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Payment required. Please add credits to your workspace.');
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;
    const analysis = JSON.parse(analysisText);

    console.log('AI analysis complete:', analysis);

    // Store in database (skip in test mode)
    if (!test_mode) {
      const { error: insertError } = await supabase
        .from('match_scores')
        .upsert({
          user_id: userId,
          job_id: jobId,
          overall_score: analysis.overall_score,
          required_criteria_met: analysis.required_criteria_met,
          required_criteria_total: analysis.required_criteria_total,
          preferred_criteria_met: analysis.preferred_criteria_met,
          preferred_criteria_total: analysis.preferred_criteria_total,
          club_match_factors: analysis.club_match_factors,
          club_match_score: analysis.club_match_score,
          additional_factors: analysis.additional_factors,
          gaps: analysis.gaps,
          hard_stops: analysis.hard_stops,
          quick_wins: analysis.quick_wins,
          longer_term_actions: analysis.longer_term_actions,
        });

      if (insertError) {
        console.error('Error storing match score:', insertError);
        throw new Error('Failed to store match score');
      }
    } else {
      console.log('[Test Mode] Skipping database storage');
    }

    await logAIUsage({
      userId,
      functionName: 'calculate-match-score',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: true
    });

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Internal] Error in calculate-match-score:', error);
    await logAIUsage({
      userId,
      functionName: 'calculate-match-score',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    return new Response(
      JSON.stringify({ error: 'Unable to calculate match score. Please try again.' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});