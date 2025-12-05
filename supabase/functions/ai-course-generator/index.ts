import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { publicCorsHeaders, handleCorsPreFlight } from '../_shared/cors-config.ts';
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { verifyRecaptcha, createRecaptchaErrorResponse } from '../_shared/recaptcha-verifier.ts';
import { logAIUsage, extractClientInfo } from '../_shared/ai-logger.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(publicCorsHeaders);
  }

  const startTime = Date.now();
  const clientInfo = extractClientInfo(req);
  let userId: string | undefined;

  try {
    console.log('[ai-course-generator] Processing request');
    
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      await logAIUsage({
        functionName: 'ai-course-generator',
        ...clientInfo,
        success: false,
        errorMessage: 'No authorization header'
      });
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
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
        functionName: 'ai-course-generator',
        ...clientInfo,
        success: false,
        errorMessage: 'Authentication failed'
      });
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    userId = user.id;

    // Rate limiting: 5 requests per hour
    const rateLimit = await checkUserRateLimit(userId, 'ai-course-generator', 5);
    if (!rateLimit.allowed) {
      console.log('[ai-course-generator] Rate limit exceeded for user:', userId);
      await logAIUsage({
        userId,
        functionName: 'ai-course-generator',
        ...clientInfo,
        rateLimitHit: true,
        success: false,
        errorMessage: 'Rate limit exceeded'
      });
      return createRateLimitResponse(rateLimit.retryAfter!, publicCorsHeaders);
    }
    
    const { action, prompt, courseData, recaptchaToken } = await req.json();

    // reCAPTCHA verification
    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'course_generator', 0.5);
      if (!recaptchaResult.success) {
        await logAIUsage({
          userId,
          functionName: 'ai-course-generator',
          ...clientInfo,
          recaptchaScore: recaptchaResult.score,
          recaptchaPassed: false,
          success: false,
          errorMessage: 'reCAPTCHA verification failed'
        });
        return createRecaptchaErrorResponse(recaptchaResult, publicCorsHeaders);
      }
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "generate_course") {
      systemPrompt = "You are an expert instructional designer helping create engaging online courses. Provide detailed, actionable course structures.";
      userPrompt = `Based on this topic or idea: "${prompt}", create a complete course structure with:
1. A compelling course title
2. An engaging description (2-3 paragraphs)
3. Difficulty level (beginner/intermediate/advanced/expert)
4. Estimated hours to complete
5. 5-8 module titles with brief descriptions

Format as JSON: {
  "title": "Course Title",
  "description": "Detailed description",
  "difficulty_level": "intermediate",
  "estimated_hours": 12,
  "modules": [
    {"title": "Module 1", "description": "What students will learn", "order": 1},
    ...
  ]
}`;
    } else if (action === "enhance_description") {
      systemPrompt = "You are an expert copywriter specializing in educational content. Make course descriptions compelling and clear.";
      userPrompt = `Enhance this course description to be more engaging and professional:\n\nTitle: ${courseData.title}\nCurrent description: ${prompt}\n\nProvide an improved 2-3 paragraph description that highlights learning outcomes and benefits.`;
    } else if (action === "suggest_modules") {
      systemPrompt = "You are an expert curriculum designer. Create logical, progressive learning modules.";
      userPrompt = `For a course titled "${courseData.title}" with description: "${courseData.description}", suggest 5-8 module titles and descriptions that build progressively. Format as JSON array: [{"title": "Module Title", "description": "Brief description", "order": 1}, ...]`;
    } else if (action === "improve_title") {
      systemPrompt = "You are an expert at creating compelling course titles that attract learners.";
      userPrompt = `Suggest 3 improved versions of this course title: "${prompt}". Make them engaging, clear, and professional. Return as JSON: {"suggestions": ["Title 1", "Title 2", "Title 3"]}`;
    } else if (action === "suggest_content") {
      systemPrompt = "You are an expert content curator. Find the best free educational resources (specifically YouTube videos) for learning modules.";
      userPrompt = `For a learning module titled "${courseData.moduleTitle}" (part of course "${courseData.courseTitle}") with description: "${courseData.moduleDescription}", suggest 3 relevant YouTube video topics/search queries that would be perfect for this lesson. 
      
      Return as JSON: {
        "suggestions": [
          {
            "title": "Video Title Idea 1",
            "search_query": "exact search query for youtube",
            "reason": "Why this is good"
          },
          ...
        ]
      }`;
    }

    console.log('[ai-course-generator] Calling Lovable AI for action:', action);

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
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorMessage = response.status === 429 ? 'AI rate limit exceeded' :
                          response.status === 402 ? 'AI credits exhausted' :
                          'AI service error';
      
      await logAIUsage({
        userId,
        functionName: 'ai-course-generator',
        ...clientInfo,
        responseTimeMs: Date.now() - startTime,
        success: false,
        errorMessage
      });

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded. Please try again later." }),
          { status: 429, headers: { ...publicCorsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...publicCorsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("[ai-course-generator] AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    await logAIUsage({
      userId,
      functionName: 'ai-course-generator',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: true
    });

    console.log('[ai-course-generator] Content generated successfully');

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...publicCorsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ai-course-generator] Error:", error);
    await logAIUsage({
      userId,
      functionName: 'ai-course-generator',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...publicCorsHeaders, "Content-Type": "application/json" } }
    );
  }
});
