import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth: extract user from JWT
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || supabaseServiceKey);

    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await anonClient.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Role check: admin/super_admin/strategist only
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isAuthorized = roles?.some((r: { role: string }) =>
      ["admin", "super_admin", "strategist"].includes(r.role)
    );

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(
        JSON.stringify({ error: "jobId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, title, description, location, employment_type, salary_min, salary_max, salary_currency")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate sourcing strategy via Lovable AI
    const prompt = `You are an elite headhunter at a top-tier recruitment agency. Generate a comprehensive sourcing strategy for this role.

Job Title: ${job.title}
Description: ${job.description || "Not provided"}
Location: ${job.location || "Not specified"}
Employment Type: ${job.employment_type || "Not specified"}
Salary Range: ${job.salary_min && job.salary_max ? `${job.salary_currency || "EUR"} ${job.salary_min}-${job.salary_max}` : "Not disclosed"}

Return your response using the suggest_sourcing_strategy function.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert technical recruiter specializing in Boolean search and multi-platform talent sourcing. Always respond using the provided tool." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_sourcing_strategy",
              description: "Return a structured sourcing strategy with Boolean search strings and platform tips.",
              parameters: {
                type: "object",
                properties: {
                  linkedin_queries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", description: "Short label like 'Title + Core Skills'" },
                        query: { type: "string", description: "LinkedIn Boolean search string" },
                      },
                      required: ["label", "query"],
                      additionalProperties: false,
                    },
                    description: "5 LinkedIn Boolean search strings with variations",
                  },
                  github_queries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        query: { type: "string" },
                      },
                      required: ["label", "query"],
                      additionalProperties: false,
                    },
                    description: "2-3 GitHub search queries for technical roles",
                  },
                  platform_tips: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        platform: { type: "string", description: "e.g. LinkedIn, GitHub, Stack Overflow, Meetup" },
                        tip: { type: "string", description: "Specific actionable tip for this platform" },
                      },
                      required: ["platform", "tip"],
                      additionalProperties: false,
                    },
                  },
                  estimated_effort_hours: {
                    type: "number",
                    description: "Estimated hours to source 20 qualified candidates",
                  },
                  ideal_candidate_summary: {
                    type: "string",
                    description: "2-3 sentence summary of the ideal candidate profile",
                  },
                },
                required: ["linkedin_queries", "github_queries", "platform_tips", "estimated_effort_hours", "ideal_candidate_summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_sourcing_strategy" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResp.text();
      console.error("[guide-sourcing-strategy] AI error:", aiResp.status, errText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let strategy;
    if (toolCall?.function?.arguments) {
      strategy = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      // Fallback: try to parse from content
      const content = aiData.choices?.[0]?.message?.content;
      strategy = {
        linkedin_queries: [{ label: "General search", query: job.title }],
        github_queries: [],
        platform_tips: [{ platform: "LinkedIn", tip: "Use Recruiter Lite filters" }],
        estimated_effort_hours: 8,
        ideal_candidate_summary: content || "See job description for details.",
      };
    }

    // Log decision
    await supabase.from("agent_decision_log").insert({
      agent_name: "guide-sourcing-strategy",
      decision_type: "sourcing_strategy_generated",
      decision_made: `Generated sourcing strategy for "${job.title}"`,
      confidence_score: 0.85,
      context_used: { job_id: jobId, job_title: job.title },
      affected_entities: { job_id: jobId },
      user_id: userId,
    });

    return new Response(
      JSON.stringify({ success: true, job_id: jobId, job_title: job.title, strategy }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[guide-sourcing-strategy] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
