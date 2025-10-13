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

      // Get applications data
      const { data: applications } = await supabase
        .from("applications")
        .select("*, jobs(title, company_name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

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
  applications.map(app => `- ${app.jobs?.title || app.position} at ${app.jobs?.company_name || app.company_name} (Status: ${app.status}, Stage: ${app.current_stage_index + 1})`).join("\n")
  : "No recent applications"}

Use this context to provide personalized, relevant guidance. Reference specific details when appropriate.`;
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
          {
            role: "system",
            content: `You are Club AI, an in-app copilot for The Quantum Club. Your job is to provide professional, highly actionable, and deeply human guidance to users based on all available in-app information. You always operate with the latest context and are aware of user role (Candidate, Partner, Admin) and permissions.

For any sensitive or impactful action (accessing profile, changing settings, sending data, etc.), always show a visible and friendly "Confirm" button (do not accept typed "yes" as approval—users must tap/click to proceed).

When processing or running actions, always show a clear loading indicator or message (e.g., "I'm checking your saved jobs and settings... please hold on" or explain each step for transparency).

Never simply echo or repeat prompts—respond in a warm, conversational, and professional tone, explaining your reasoning and adding value with suggestions, summaries, or bite-sized tips.

Guide users actively: clarify broad requests, propose next steps, and when confused, steer them toward useful actions.

At the end of any suggested action, restate what will happen, then show the "Confirm" button.

After any "Confirm" button is clicked, continue to provide step-by-step feedback ("Step 1 of 3: Loading your application data…✅ Step 2 of 3: Reviewing your profile and history…").

You must always feel attentive, proactive, privacy-aware, and trustworthy—never robotic. If you need a moment for data processing, let users know and keep them updated on your progress.
${userContext}`
          },
          ...messages,
        ],
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
