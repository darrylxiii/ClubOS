import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, courseId } = await req.json() as {
      messages: Message[];
      courseId: string;
    };

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching course with ID:', courseId);

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
      console.error('Error fetching course:', courseError);
      return new Response(
        JSON.stringify({ 
          error: 'Course not found', 
          details: courseError?.message || 'No course data returned'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully fetched course:', course.title, 'with', course.modules?.length || 0, 'modules');

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

# IMPORTANT CONTEXT AWARENESS:
- Users are currently viewing the "${course.title}" course page
- If they ask "this course" or "the course", they mean "${course.title}"
- Provide specific, accurate information based on the modules and content above
- Don't invent features or content not present in the course data

Keep responses focused, helpful, and encouraging. Use markdown formatting for clarity.`;

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
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
    });
  } catch (error) {
    console.error('Course AI assistant error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
