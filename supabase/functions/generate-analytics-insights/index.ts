import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { userId } = await req.json();

    // Fetch user's analytics data
    const { data: profileAnalytics } = await supabase
      .from("profile_analytics")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(30);

    const { data: postInteractions } = await supabase
      .from("post_interactions")
      .select("*, unified_posts(*)")
      .eq("unified_posts.user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: userPosts } = await supabase
      .from("unified_posts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Generate AI insights
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const analyticsContext = {
      recentAnalytics: profileAnalytics,
      totalPosts: userPosts?.length || 0,
      recentInteractions: postInteractions?.length || 0,
    };

    const prompt = `Analyze the following social media analytics data and generate 3-5 actionable insights:

Analytics Data:
${JSON.stringify(analyticsContext, null, 2)}

Generate insights about:
1. Best time to post (based on engagement patterns)
2. Content recommendations (what's working, what isn't)
3. Audience insights (engagement trends, growth patterns)
4. Performance predictions
5. Gamification suggestions (achievements they're close to unlocking)

Return JSON array with insights in this format:
{
  "insights": [
    {
      "type": "best_time_to_post|content_recommendation|audience_insight|performance|achievement",
      "title": "Short catchy title",
      "content": "Detailed actionable insight",
      "confidence": 0.85
    }
  ]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert social media analytics advisor. Provide clear, actionable insights." },
          { role: "user", content: prompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_insights",
            description: "Generate analytics insights",
            parameters: {
              type: "object",
              properties: {
                insights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      title: { type: "string" },
                      content: { type: "string" },
                      confidence: { type: "number" }
                    },
                    required: ["type", "title", "content", "confidence"]
                  }
                }
              },
              required: ["insights"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_insights" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (aiResponse.status === 402) {
        throw new Error("AI credits exhausted. Please add credits to continue.");
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    const insights = toolCall ? JSON.parse(toolCall.function.arguments).insights : [];

    // Save insights to database
    for (const insight of insights) {
      await supabase.from("analytics_insights").insert({
        user_id: userId,
        insight_type: insight.type,
        insight_title: insight.title,
        insight_content: insight.content,
        confidence_score: insight.confidence,
      });
    }

    return new Response(
      JSON.stringify({ success: true, insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});