import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, prompt, courseData } = await req.json();
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
    }

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
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-course-generator:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
