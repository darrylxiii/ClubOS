import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { projectId, freelancerId } = await req.json();

    if (!projectId || !freelancerId) {
      throw new Error("Project ID and Freelancer ID are required");
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        *,
        companies (name, industry),
        profiles:posted_by (first_name, last_name)
      `)
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    // Fetch freelancer profile and experience
    const { data: freelancer, error: freelancerError } = await supabase
      .from("freelance_profiles")
      .select(`
        *,
        profiles:id (
          first_name,
          last_name,
          email,
          skills,
          experience,
          bio,
          linkedin_url
        )
      `)
      .eq("id", freelancerId)
      .single();

    if (freelancerError || !freelancer) {
      throw new Error("Freelancer not found");
    }

    // Fetch past successful proposals (for learning)
    const { data: pastProposals } = await supabase
      .from("project_proposals")
      .select("cover_letter, match_score")
      .eq("freelancer_id", freelancerId)
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .limit(3);

    // Call Lovable AI to generate proposal
    const aiPrompt = buildProposalPrompt(project, freelancer, pastProposals || []);

    const aiResponse = await fetch("https://api.lovable.app/v1/ai/analyze", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        prompt: aiPrompt,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("AI generation failed");
    }

    const aiResult = await aiResponse.json();
    const generatedProposal = parseAIProposal(aiResult.response);

    // Calculate smart rate recommendation
    const suggestedRate = calculateSmartRate(
      freelancer,
      project,
      project.engagement_type
    );

    // Select best portfolio samples
    const portfolioHighlights = selectRelevantPortfolio(
      freelancer.portfolio_items || [],
      project.skills_required || []
    );

    return new Response(
      JSON.stringify({
        success: true,
        proposal: {
          cover_letter: generatedProposal.coverLetter,
          proposed_rate: suggestedRate,
          proposed_timeline_weeks: estimateTimeline(project, freelancer),
          proposed_deliverables: project.deliverables,
          portfolio_highlights: portfolioHighlights,
          availability_statement: generateAvailabilityStatement(freelancer),
          questions_for_client: generatedProposal.questions,
          ai_confidence: generatedProposal.confidence,
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error: any) {
    console.error("Error generating proposal:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});

function buildProposalPrompt(project: any, freelancer: any, pastProposals: any[]): string {
  return `You are an expert freelance proposal writer for The Quantum Club, a premium talent platform.

Write a compelling, professional proposal for this project:

PROJECT:
Title: ${project.title}
Description: ${project.description}
Skills Required: ${project.skills_required?.join(", ")}
Budget: €${project.budget_min} - €${project.budget_max}
Timeline: ${project.timeline_weeks} weeks
Company: ${project.companies?.name} (${project.companies?.industry})

FREELANCER PROFILE:
Name: ${freelancer.profiles?.first_name} ${freelancer.profiles?.last_name}
Experience: ${freelancer.profiles?.experience} years
Skills: ${freelancer.profiles?.skills?.join(", ")}
Completed Projects: ${freelancer.total_completed_projects}
Rating: ${freelancer.avg_project_rating || "New"}/5.0
Bio: ${freelancer.profiles?.bio || "Not provided"}

PAST SUCCESSFUL PROPOSALS (for reference):
${pastProposals.map(p => p.cover_letter).join("\n\n---\n\n")}

INSTRUCTIONS:
1. Write a 400-600 word proposal that:
   - Opens with a personalized hook related to the company/project
   - Highlights 2-3 specific relevant experiences from the freelancer's background
   - Explains WHY the freelancer is uniquely qualified (not just what they can do)
   - Addresses potential concerns proactively
   - Ends with a clear call-to-action

2. Also suggest 3-5 smart questions the freelancer should ask the client to demonstrate expertise

3. Assess confidence level (0-100) based on skills match

Return as JSON:
{
  "coverLetter": "...",
  "questions": ["...", "..."],
  "confidence": 85
}

Be professional but warm. Show personality. Avoid generic phrases.`;
}

function parseAIProposal(aiResponse: string): any {
  try {
    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse AI response:", e);
  }

  // Fallback
  return {
    coverLetter: aiResponse,
    questions: [
      "What does success look like for this project?",
      "Are there any existing brand guidelines or style preferences?",
      "What is the preferred communication cadence?"
    ],
    confidence: 75
  };
}

function calculateSmartRate(freelancer: any, project: any, engagementType: string): number {
  const baseRate = (freelancer.hourly_rate_min + freelancer.hourly_rate_max) / 2 || 100;

  // Adjust based on project complexity and budget
  let adjustedRate = baseRate;

  // If project budget is high, can charge higher
  if (project.budget_max && project.estimated_hours) {
    const maxHourlyFromBudget = project.budget_max / project.estimated_hours;
    if (maxHourlyFromBudget > baseRate * 1.2) {
      adjustedRate = baseRate * 1.15; // Increase rate by 15%
    }
  }

  // Adjust for experience and ratings
  if (freelancer.avg_project_rating >= 4.8 && freelancer.total_completed_projects >= 10) {
    adjustedRate *= 1.1; // Premium for top-rated
  }

  // For fixed-price projects, calculate total
  if (engagementType === 'fixed' && project.estimated_hours) {
    return Math.round(adjustedRate * project.estimated_hours);
  }

  return Math.round(adjustedRate);
}

function estimateTimeline(project: any, freelancer: any): number {
  // Base estimate from project
  const weeks = project.timeline_weeks || 4;

  // Adjust based on freelancer availability
  const hoursPerWeek = freelancer.availability_hours_per_week || 20;
  const estimatedHours = project.estimated_hours || 40;
  
  const calculatedWeeks = Math.ceil(estimatedHours / hoursPerWeek);

  // Return the more conservative estimate
  return Math.max(weeks, calculatedWeeks);
}

function selectRelevantPortfolio(portfolioItems: any[], requiredSkills: string[]): any[] {
  if (!portfolioItems.length) return [];

  // Score each portfolio item by skill relevance
  const scored = portfolioItems.map(item => {
    const relevanceScore = requiredSkills.filter(skill =>
      item.tags?.some((tag: string) => tag.toLowerCase().includes(skill.toLowerCase()))
    ).length;

    return { ...item, relevanceScore };
  });

  // Sort by relevance and return top 3
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return scored.slice(0, 3).map(({ relevanceScore, ...item }) => item);
}

function generateAvailabilityStatement(freelancer: any): string {
  const hoursPerWeek = freelancer.availability_hours_per_week || 20;
  const availableFrom = freelancer.available_from_date 
    ? new Date(freelancer.available_from_date)
    : new Date();

  const now = new Date();
  const daysUntilAvailable = Math.ceil((availableFrom.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilAvailable <= 0) {
    return `I can start immediately and commit ${hoursPerWeek} hours per week to this project.`;
  } else if (daysUntilAvailable <= 7) {
    return `I'm available to start within the next week and can dedicate ${hoursPerWeek} hours per week.`;
  } else {
    const startDate = availableFrom.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    return `I'm available to start from ${startDate} with ${hoursPerWeek} hours per week commitment.`;
  }
}
