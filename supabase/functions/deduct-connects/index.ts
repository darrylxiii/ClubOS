import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Connects cost based on project budget
const CONNECTS_COST = {
  small: 2,      // < €500
  medium: 4,     // €500 - €5000
  large: 6,      // €5000+
  enterprise: 8, // Enterprise projects
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { projectId, proposalType = "standard" } = await req.json();
    
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    // Get project to determine connects cost
    const { data: project, error: projectError } = await supabaseClient
      .from("marketplace_projects")
      .select("budget_min, budget_max, project_type")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    // Calculate connects cost based on budget
    const avgBudget = ((project.budget_min || 0) + (project.budget_max || 0)) / 2;
    let connectsCost = CONNECTS_COST.small;
    
    if (avgBudget >= 5000) {
      connectsCost = CONNECTS_COST.large;
    } else if (avgBudget >= 500) {
      connectsCost = CONNECTS_COST.medium;
    }
    
    if (project.project_type === "enterprise") {
      connectsCost = CONNECTS_COST.enterprise;
    }

    // Boosted proposals cost more
    if (proposalType === "boosted") {
      connectsCost = Math.ceil(connectsCost * 1.5);
    }

    // Get freelancer profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("freelance_profiles")
      .select("id, connects_balance")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Freelancer profile not found");
    }

    const currentBalance = profile.connects_balance || 0;
    
    if (currentBalance < connectsCost) {
      return new Response(JSON.stringify({ 
        error: "Insufficient connects",
        required: connectsCost,
        available: currentBalance,
        needToPurchase: connectsCost - currentBalance
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Deduct connects
    const newBalance = currentBalance - connectsCost;
    
    const { error: updateError } = await supabaseClient
      .from("freelance_profiles")
      .update({ 
        connects_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error(`Failed to deduct connects: ${updateError.message}`);
    }

    console.log(`[DEDUCT-CONNECTS] Deducted ${connectsCost} connects from user ${user.id}. New balance: ${newBalance}`);

    return new Response(JSON.stringify({ 
      success: true,
      deducted: connectsCost,
      newBalance,
      projectId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[DEDUCT-CONNECTS] Error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
