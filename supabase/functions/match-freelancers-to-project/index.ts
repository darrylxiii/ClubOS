import { createHandler } from '../_shared/handler.ts';

interface MatchFactors {
  skillsOverlap: number;
  experienceMatch: number;
  budgetFit: number;
  availabilityMatch: number;
  timezoneMatch: number;
  ratingScore: number;
  completionRate: number;
}

interface FreelancerMatch {
  freelancer_id: string;
  profile: Record<string, unknown>;
  match_score: number;
  match_factors: MatchFactors;
  match_explanation: string;
  portfolio_highlights: Record<string, unknown>[];
  estimated_response_time: string;
  risk_level: string;
}

Deno.serve(createHandler(async (req, ctx) => {
    const { supabase, corsHeaders } = ctx;

    const { projectId } = await req.json();

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    // Fetch project details - try marketplace_projects first, fallback to projects
    let project: Record<string, unknown> | null = null;

    // First try marketplace_projects (Club Projects)
    const { data: marketplaceProject } = await supabase
      .from("marketplace_projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (marketplaceProject) {
      project = marketplaceProject;
    } else {
      // Fallback to legacy projects table
      const { data: legacyProject } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      project = legacyProject;
    }

    if (!project) {
      throw new Error("Project not found in marketplace_projects or projects table");
    }

    // Fetch available freelancers with profiles
    const { data: freelancers, error: freelancersError } = await supabase
      .from("freelance_profiles")
      .select(`
        *,
        profiles:id (
          id,
          first_name,
          last_name,
          email,
          avatar_url,
          location,
          timezone,
          skills,
          experience,
          languages_spoken
        )
      `)
      .eq("freelance_status", "available")
      .gte("availability_hours_per_week", 10);

    if (freelancersError) {
      throw new Error("Error fetching freelancers");
    }

    // Calculate match scores for each freelancer
    const matches: FreelancerMatch[] = [];

    for (const freelancer of freelancers || []) {
      const factors = calculateMatchFactors(project, freelancer);
      const overallScore = calculateWeightedScore(factors);

      if (overallScore >= 40) { // Minimum 40% match
        matches.push({
          freelancer_id: freelancer.id,
          profile: freelancer.profiles,
          match_score: overallScore,
          match_factors: factors,
          match_explanation: generateMatchExplanation(factors, project, freelancer),
          portfolio_highlights: selectPortfolioHighlights(freelancer.portfolio_items, project.skills_required),
          estimated_response_time: estimateResponseTime(freelancer),
          risk_level: assessRiskLevel(freelancer, overallScore)
        });
      }
    }

    // Sort by match score and return top 5
    matches.sort((a, b) => b.match_score - a.match_score);
    const topMatches = matches.slice(0, 5);

    return new Response(
      JSON.stringify({
        success: true,
        matches: topMatches,
        total_evaluated: freelancers?.length || 0
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
}));

function calculateMatchFactors(project: Record<string, unknown>, freelancer: Record<string, unknown>): MatchFactors {
  const profiles = freelancer.profiles as Record<string, unknown> | null;
  const skillsOverlap = calculateSkillsOverlap(
    (project.skills_required as string[]) || [],
    (profiles?.skills as string[]) || []
  );

  const experienceMatch = calculateExperienceMatch(
    project.experience_level as string,
    (profiles?.experience as number) || 0
  );

  const budgetFit = calculateBudgetFit(
    project.budget_min as number,
    project.budget_max as number,
    freelancer.hourly_rate_min as number,
    freelancer.hourly_rate_max as number,
    project.engagement_type as string,
    project.estimated_hours as number
  );

  const availabilityMatch = calculateAvailabilityMatch(
    project.start_date_target as string,
    freelancer.available_from_date as string,
    freelancer.availability_hours_per_week as number,
    project.estimated_hours as number,
    project.timeline_weeks as number
  );

  const timezoneMatch = calculateTimezoneMatch(
    (project.timezone_requirement as string) || null,
    (freelancer.timezone_preference as string) || null
  );

  const ratingScore = ((freelancer.avg_project_rating as number) || 4.0) * 20;

  const completionRate = (freelancer.completion_rate_percentage as number) || 100;

  return {
    skillsOverlap,
    experienceMatch,
    budgetFit,
    availabilityMatch,
    timezoneMatch,
    ratingScore,
    completionRate
  };
}

function calculateWeightedScore(factors: MatchFactors): number {
  const weights = {
    skillsOverlap: 0.30,
    experienceMatch: 0.15,
    budgetFit: 0.20,
    availabilityMatch: 0.15,
    timezoneMatch: 0.05,
    ratingScore: 0.10,
    completionRate: 0.05
  };

  let score = 0;
  score += factors.skillsOverlap * weights.skillsOverlap;
  score += factors.experienceMatch * weights.experienceMatch;
  score += factors.budgetFit * weights.budgetFit;
  score += factors.availabilityMatch * weights.availabilityMatch;
  score += factors.timezoneMatch * weights.timezoneMatch;
  score += factors.ratingScore * weights.ratingScore;
  score += factors.completionRate * weights.completionRate;

  return Math.round(score * 10) / 10;
}

function calculateSkillsOverlap(requiredSkills: string[], freelancerSkills: string[]): number {
  if (!requiredSkills.length) return 100;

  const matches = requiredSkills.filter(skill =>
    freelancerSkills.some(fs => fs.toLowerCase().includes(skill.toLowerCase()))
  ).length;

  return (matches / requiredSkills.length) * 100;
}

function calculateExperienceMatch(requiredLevel: string, yearsExp: number): number {
  const levelMap: { [key: string]: number } = {
    'junior': 2,
    'mid': 5,
    'senior': 8,
    'expert': 12
  };

  const required = levelMap[requiredLevel] || 5;

  if (yearsExp >= required) return 100;
  if (yearsExp >= required * 0.7) return 80;
  if (yearsExp >= required * 0.5) return 60;
  return 40;
}

function calculateBudgetFit(
  projectMin: number,
  projectMax: number,
  freelancerMin: number,
  freelancerMax: number,
  engagementType: string,
  estimatedHours: number
): number {
  if (!projectMin || !freelancerMin) return 75; // Default if no budget info

  // For hourly projects, convert to hourly rate
  if (engagementType === 'hourly') {
    if (freelancerMax <= projectMax) return 100;
    if (freelancerMin <= projectMax) return 80;
    return 50;
  }

  // For fixed projects, check if total budget aligns
  const estimatedCost = (freelancerMin + freelancerMax) / 2 * (estimatedHours || 40);
  const projectBudget = (projectMin + projectMax) / 2;

  if (estimatedCost <= projectBudget) return 100;
  if (estimatedCost <= projectBudget * 1.2) return 80;
  if (estimatedCost <= projectBudget * 1.5) return 60;
  return 40;
}

function calculateAvailabilityMatch(
  projectStart: string,
  freelancerStart: string,
  hoursPerWeek: number,
  estimatedHours: number,
  timelineWeeks: number
): number {
  if (!projectStart || !freelancerStart) return 80;

  const projectDate = new Date(projectStart);
  const freelancerDate = new Date(freelancerStart);

  if (freelancerDate <= projectDate) return 100;

  const daysDiff = Math.floor((freelancerDate.getTime() - projectDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff <= 7) return 90;
  if (daysDiff <= 14) return 70;
  if (daysDiff <= 30) return 50;
  return 30;
}

function calculateTimezoneMatch(projectTz: string | null, freelancerTz: string | null): number {
  if (!projectTz) return 100; // No requirement
  if (!freelancerTz) return 70; // Unknown

  // Simple timezone overlap check (could be enhanced)
  if (projectTz === freelancerTz) return 100;
  return 70; // Some overlap assumed
}

function generateMatchExplanation(factors: MatchFactors, project: Record<string, unknown>, freelancer: Record<string, unknown>): string {
  const reasons = [];

  if (factors.skillsOverlap >= 80) {
    reasons.push(`Strong skills match (${Math.round(factors.skillsOverlap)}%)`);
  }

  if (factors.experienceMatch >= 80) {
    reasons.push(`Experience aligns with ${project.experience_level} level`);
  }

  if (factors.budgetFit >= 80) {
    reasons.push("Budget expectations compatible");
  }

  if (factors.availabilityMatch >= 80) {
    reasons.push("Available to start immediately");
  }

  if (factors.ratingScore >= 80 && (freelancer.total_completed_projects as number) > 0) {
    reasons.push(`Excellent track record (${freelancer.total_completed_projects} projects)`);
  }

  if ((freelancer.completion_rate_percentage as number) >= 95) {
    reasons.push("High project completion rate");
  }

  return reasons.length > 0
    ? reasons.join(" • ")
    : "Good overall fit for this project";
}

function selectPortfolioHighlights(portfolioItems: Record<string, unknown>[], requiredSkills: string[]): Record<string, unknown>[] {
  if (!portfolioItems || !portfolioItems.length) return [];

  const relevant = portfolioItems.filter((item) =>
    requiredSkills.some(skill =>
      (item.tags as string[])?.some((tag: string) => tag.toLowerCase().includes(skill.toLowerCase()))
    )
  );

  return relevant.slice(0, 3);
}

function estimateResponseTime(freelancer: Record<string, unknown>): string {
  if ((freelancer.active_projects_count as number) === 0) return "Within 2 hours";
  if ((freelancer.active_projects_count as number) <= 2) return "Within 24 hours";
  return "Within 48 hours";
}

function assessRiskLevel(freelancer: Record<string, unknown>, matchScore: number): string {
  if ((freelancer.total_completed_projects as number) >= 10 && (freelancer.avg_project_rating as number) >= 4.5) {
    return "low";
  }

  if ((freelancer.total_completed_projects as number) >= 3 && matchScore >= 70) {
    return "medium";
  }

  return "higher"; // New freelancer or lower match
}
