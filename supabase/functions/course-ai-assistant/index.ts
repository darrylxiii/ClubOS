import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { publicCorsHeaders, handleCorsPreFlight } from '../_shared/cors-config.ts';
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { logAIUsage, extractClientInfo } from '../_shared/ai-logger.ts';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(publicCorsHeaders);
  }

  const startTime = Date.now();
  const clientInfo = extractClientInfo(req);
  let userId: string | undefined;

  try {
    console.log('[course-ai-assistant] Processing request');
    
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[course-ai-assistant] No auth header');
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
      console.log('[course-ai-assistant] Auth failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    userId = user.id;

    // Rate limiting: 30 requests per hour
    const rateLimit = await checkUserRateLimit(userId, 'course-ai-assistant', 30);
    if (!rateLimit.allowed) {
      console.log('[course-ai-assistant] Rate limit exceeded for user:', userId);
      await logAIUsage({
        userId,
        functionName: 'course-ai-assistant',
        ...clientInfo,
        rateLimitHit: true,
        success: false,
        errorMessage: 'Rate limit exceeded'
      });
      return createRateLimitResponse(rateLimit.retryAfter!, publicCorsHeaders);
    }

    const { messages, courseId } = await req.json() as {
      messages: Message[];
      courseId: string;
    };

    console.log('[course-ai-assistant] Fetching course with ID:', courseId);

    // Fetch the current course with all its modules
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        profiles:created_by(full_name),
        modules(
          id,
          title,
          description,
          estimated_minutes,
          display_order,
          module_type,
          video_url,
          is_published
        )
      `)
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      console.error('[course-ai-assistant] Error fetching course:', courseError);
      return new Response(
        JSON.stringify({ 
          error: 'Course not found', 
          details: courseError?.message || 'No course data returned'
        }),
        { status: 404, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[course-ai-assistant] Successfully fetched course:', course.title, 'with', course.modules?.length || 0, 'modules');

    // Fetch all other courses for comparative questions
    const { data: allCourses } = await supabase
      .from('courses')
      .select('id, title, description, difficulty_level, estimated_hours, is_published')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    // Build comprehensive course context
    const modulesContext = course.modules
      ?.sort((a: any, b: any) => a.display_order - b.display_order)
      .map((mod: any, idx: number) => `
Module ${idx + 1}: ${mod.title} (${mod.module_type})
${mod.description ? `Description: ${mod.description}` : ''}
${mod.estimated_minutes ? `Duration: ${mod.estimated_minutes} minutes` : ''}
${mod.video_url ? `Has video content` : ''}
${mod.is_published ? 'Published' : 'Draft'}
`).join('\n') || 'No modules available yet.';

    const otherCoursesContext = allCourses
      ?.filter((c: any) => c.id !== courseId)
      .map((c: any) => `- ${c.title} (${c.difficulty_level}, ${c.estimated_hours}h)`)
      .join('\n') || '';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an expert learning assistant for Quantum Club Academy, currently helping with the course: "${course.title}"

# CURRENT COURSE YOU'RE ASSISTING WITH:
**${course.title}** (${course.difficulty_level || 'All levels'})
${course.description || 'No description available'}
Duration: ${course.estimated_hours || 'N/A'} hours
Instructor: ${course.profiles?.full_name || 'Expert Instructor'}

# COURSE MODULES:
${modulesContext}

${otherCoursesContext ? `# OTHER AVAILABLE COURSES:
${otherCoursesContext}` : ''}

# YOUR ROLE:
- Answer questions clearly and concisely about **this specific course** ("${course.title}")
- Explain what students will learn from specific modules and the overall course structure
- Provide insights about the course difficulty, prerequisites, and who it's best suited for
- When asked about other courses, you can reference them using the list above
- Help prospective students understand if this course matches their goals
- Explain module content, sequence, and estimated time commitments
- Suggest study approaches and learning strategies
- Be encouraging and highlight the value of the course
- If asked about content not covered in this course, suggest other courses if relevant
- When unsure about specific details, acknowledge limitations honestly

Keep responses focused, helpful, and encouraging. Use markdown formatting for clarity.`;

    console.log('[course-ai-assistant] Calling Lovable AI');

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
        functionName: 'course-ai-assistant',
        ...clientInfo,
        responseTimeMs: Date.now() - startTime,
        success: false,
        errorMessage
      });

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please contact support.' }),
          { status: 402, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('[course-ai-assistant] AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await logAIUsage({
      userId,
      functionName: 'course-ai-assistant',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: true
    });

    console.log('[course-ai-assistant] Streaming response');

    return new Response(response.body, {
      headers: { ...publicCorsHeaders, 'Content-Type': 'text/event-stream' }
    });
  } catch (error) {
    console.error('[course-ai-assistant] Error:', error);
    await logAIUsage({
      userId,
      functionName: 'course-ai-assistant',
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
