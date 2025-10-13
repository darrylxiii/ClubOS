import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch comprehensive user data
    let userContext = "";
    
    if (userId) {
      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      // Get user roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      // Get company associations
      const { data: companyMember } = await supabase
        .from("company_members")
        .select(`
          role,
          is_active,
          companies!inner (
            id,
            name,
            slug,
            description,
            industry,
            company_size,
            website_url,
            headquarters_location,
            mission,
            vision,
            values,
            culture_highlights,
            tech_stack,
            benefits
          )
        `)
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      const companyData = Array.isArray(companyMember?.companies) 
        ? companyMember?.companies[0] 
        : companyMember?.companies;

      // Get applications data with full details
      const { data: applications } = await supabase
        .from("applications")
        .select(`
          id,
          position,
          company_name,
          status,
          current_stage_index,
          created_at,
          updated_at,
          stages,
          jobs(id, title, company_name, description, location, employment_type)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(15);

      // Get tasks
      const { data: tasks } = await supabase
        .from("unified_tasks")
        .select("*")
        .eq("assigned_to", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Get objectives
      const { data: objectives } = await supabase
        .from("club_objectives")
        .select("*")
        .or(`created_by.eq.${userId},owners.cs.{${userId}}`)
        .order("created_at", { ascending: false })
        .limit(5);

      // Get bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select(`
          id,
          status,
          scheduled_start,
          scheduled_end,
          booking_links(title, description)
        `)
        .eq("user_id", userId)
        .gte("scheduled_start", new Date().toISOString())
        .order("scheduled_start", { ascending: true })
        .limit(5);

      // Get jobs user might be interested in
      const { data: availableJobs } = await supabase
        .from("jobs")
        .select("id, title, company_name, location, employment_type, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);

      // Get profile strength
      const { data: profileStrength } = await supabase
        .from("profile_strength_stats")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      // Build context string
      userContext = `

=== USER PROFILE DATA ===
Name: ${profile?.full_name || "Not set"}
Email: ${profile?.email || "Not set"}
Current Title: ${profile?.current_title || "Not set"}
Bio: ${profile?.bio || "Not set"}
Location: ${profile?.location || "Not set"}
Phone: ${profile?.phone_verified ? "Verified" : "Not verified"}
Email Verified: ${profile?.email_verified ? "Yes" : "No"}
Profile Completion: ${profileStrength?.completion_percentage || 0}%

=== USER ROLES ===
${roles?.map(r => r.role).join(", ") || "No roles assigned"}

=== COMPANY ASSOCIATION ===
${companyData ? `
Company: ${companyData.name}
Role at Company: ${companyMember?.role || "Unknown"}
Industry: ${companyData.industry || "Not specified"}
Company Size: ${companyData.company_size || "Not specified"}
Location: ${companyData.headquarters_location || "Not specified"}
Mission: ${companyData.mission || "Not specified"}
Website: ${companyData.website_url || "Not specified"}
` : "User is not associated with any company"}

=== RECENT APPLICATIONS ===
${applications && applications.length > 0 ? 
  applications.map(app => {
    const stageName = app.stages?.[app.current_stage_index]?.name || "Unknown";
    const jobData = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
    return `- ${jobData?.title || app.position} at ${jobData?.company_name || app.company_name}
  Status: ${app.status} | Stage: ${stageName} (${app.current_stage_index + 1}/${app.stages?.length || 0})
  Applied: ${new Date(app.created_at).toLocaleDateString()}`;
  }).join("\n")
  : "No recent applications"}

=== TASKS & OBJECTIVES ===
Tasks (${tasks?.length || 0} active):
${tasks && tasks.length > 0 ?
  tasks.map(t => `- ${t.title} (${t.status}) - Priority: ${t.priority}`).join("\n")
  : "No active tasks"}

Objectives (${objectives?.length || 0}):
${objectives && objectives.length > 0 ?
  objectives.map(o => `- ${o.title} (${o.status}) - ${o.completion_percentage}% complete`).join("\n")
  : "No active objectives"}

=== UPCOMING BOOKINGS ===
${bookings && bookings.length > 0 ?
  bookings.map(b => {
    const linkData = Array.isArray(b.booking_links) ? b.booking_links[0] : b.booking_links;
    return `- ${linkData?.title || "Meeting"} on ${new Date(b.scheduled_start).toLocaleString()}`;
  }).join("\n")
  : "No upcoming bookings"}

=== AVAILABLE OPPORTUNITIES ===
${availableJobs && availableJobs.length > 0 ?
  availableJobs.map(j => `- ${j.title} at ${j.company_name} (${j.location || "Remote"})`).join("\n")
  : "No new opportunities available"}

Use this context to provide personalized, relevant guidance. Reference specific details when appropriate.`;
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Define available tools for the AI
    const tools = [
      {
        type: "function",
        function: {
          name: "navigate_to_page",
          description: "Navigate the user to a specific page in The Quantum Club app. Use this when you need to redirect the user.",
          parameters: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "The route path to navigate to (e.g., '/admin/companies', '/jobs', '/applications', '/settings')"
              },
              reason: {
                type: "string",
                description: "Brief explanation of why you're navigating them here"
              }
            },
            required: ["path", "reason"]
          }
        }
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are Club AI, an in-app copilot for The Quantum Club. Your job is to provide professional, highly actionable, and deeply human guidance to users based on all available in-app information. You always operate with the latest context and are aware of user role (Candidate, Partner, Admin) and permissions.

IMPORTANT NAVIGATION CAPABILITIES:
- You can navigate users to any page using the navigate_to_page function
- When confirming actions that require navigation, use the tool AFTER user confirms
- Show step-by-step progress for multi-step workflows
- Format progress as: "Step X of Y: Description... ✅" when complete

For any sensitive or impactful action (accessing profile, changing settings, sending data, etc.), always show a visible and friendly "Confirm" button (use <button>Confirm</button> in your response).

When processing or running actions, always show clear step-by-step feedback with checkmarks (✅) for completed steps.

Never simply echo or repeat prompts—respond in a warm, conversational, and professional tone, explaining your reasoning and adding value with suggestions, summaries, or bite-sized tips.

Guide users actively: clarify broad requests, propose next steps, and when confused, steer them toward useful actions.

At the end of any suggested action, restate what will happen, then show the "Confirm" button.

After any "Confirm" button is clicked, continue to provide step-by-step feedback and use navigation tools when appropriate.

You must always feel attentive, proactive, privacy-aware, and trustworthy—never robotic.
${userContext}`
          },
          ...messages,
        ],
        tools: tools,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("club-ai-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
