/**
 * Match score calculation action handler
 * Handles candidate-job matching, move probability, hiring intent
 */

import type { MetricsContext, ActionResult } from "../index.ts";

interface MatchPayload {
  type?: "match-score" | "enhanced-match" | "move-probability" | "hiring-intent" | "stakeholder-influence";
  candidate_id?: string;
  job_id?: string;
  company_id?: string;
  stakeholder_id?: string;
}

interface MatchResult {
  score: number;
  confidence: number;
  factors: MatchFactor[];
  recommendation?: string;
}

interface MatchFactor {
  name: string;
  weight: number;
  score: number;
  details?: string;
}

export async function calculateMatchScoreAction(ctx: MetricsContext): Promise<ActionResult> {
  const payload = ctx.payload as unknown as MatchPayload;
  const type = payload.type || "match-score";
  
  try {
    let result: MatchResult | Record<string, MatchResult> | null = null;

    switch (type) {
      case "match-score":
      case "enhanced-match":
        if (!payload.candidate_id || !payload.job_id) {
          return { success: false, error: "candidate_id and job_id are required" };
        }
        result = await calculateCandidateJobMatch(ctx, payload.candidate_id, payload.job_id, type === "enhanced-match");
        break;

      case "move-probability":
        if (!payload.candidate_id) {
          return { success: false, error: "candidate_id is required" };
        }
        result = await calculateMoveProbability(ctx, payload.candidate_id);
        break;

      case "hiring-intent":
        if (!payload.company_id) {
          return { success: false, error: "company_id is required" };
        }
        result = await calculateHiringIntent(ctx, payload.company_id);
        break;

      case "stakeholder-influence":
        if (!payload.company_id) {
          return { success: false, error: "company_id is required" };
        }
        result = await calculateStakeholderInfluence(ctx, payload.company_id, payload.stakeholder_id);
        break;
    }

    return {
      success: true,
      data: result,
    };

  } catch (error) {
    console.error("[calculate-match-score] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to calculate match score",
    };
  }
}

async function calculateCandidateJobMatch(
  ctx: MetricsContext,
  candidateId: string,
  jobId: string,
  enhanced: boolean
): Promise<MatchResult> {
  // Fetch candidate profile
  const { data: candidate } = await ctx.supabase
    .from("profiles")
    .select("*, candidate_skills(*), candidate_experience(*)")
    .eq("id", candidateId)
    .single();

  // Fetch job details
  const { data: job } = await ctx.supabase
    .from("jobs")
    .select("*, job_skills(*), companies(name, industry)")
    .eq("id", jobId)
    .single();

  if (!candidate || !job) {
    return {
      score: 0,
      confidence: 0,
      factors: [],
      recommendation: "Unable to calculate - missing data",
    };
  }

  const factors: MatchFactor[] = [];

  // Skills match
  const candidateSkills = new Set(
    (candidate.candidate_skills || []).map((s: any) => s.skill_name?.toLowerCase())
  );
  const jobSkills = (job.job_skills || []) as any[];
  const requiredSkills = jobSkills.filter((s: any) => s.is_required);
  const bonusSkills = jobSkills.filter((s: any) => !s.is_required);

  const requiredMatches = requiredSkills.filter((s: any) => 
    candidateSkills.has(s.skill_name?.toLowerCase())
  ).length;
  const bonusMatches = bonusSkills.filter((s: any) => 
    candidateSkills.has(s.skill_name?.toLowerCase())
  ).length;

  const skillsScore = requiredSkills.length > 0
    ? (requiredMatches / requiredSkills.length) * 70 + (bonusMatches / Math.max(bonusSkills.length, 1)) * 30
    : 50;

  factors.push({
    name: "skills_match",
    weight: 0.35,
    score: Math.round(skillsScore),
    details: `${requiredMatches}/${requiredSkills.length} required, ${bonusMatches}/${bonusSkills.length} bonus`,
  });

  // Experience match
  const candidateExp = candidate.candidate_experience || [];
  const totalYears = candidateExp.reduce((sum: number, exp: any) => {
    if (exp.start_date) {
      const start = new Date(exp.start_date);
      const end = exp.end_date ? new Date(exp.end_date) : new Date();
      return sum + (end.getFullYear() - start.getFullYear());
    }
    return sum;
  }, 0);

  const expScore = Math.min(100, (totalYears / 10) * 100);
  factors.push({
    name: "experience_level",
    weight: 0.25,
    score: Math.round(expScore),
    details: `${totalYears} years total experience`,
  });

  // Salary fit
  const candidateSalary = candidate.expected_salary || candidate.current_salary;
  const jobSalaryMin = job.salary_min || 0;
  const jobSalaryMax = job.salary_max || Infinity;
  
  let salaryScore = 50;
  if (candidateSalary) {
    if (candidateSalary >= jobSalaryMin && candidateSalary <= jobSalaryMax) {
      salaryScore = 100;
    } else if (candidateSalary < jobSalaryMin) {
      salaryScore = Math.max(0, 100 - ((jobSalaryMin - candidateSalary) / jobSalaryMin) * 100);
    } else {
      salaryScore = Math.max(0, 100 - ((candidateSalary - jobSalaryMax) / jobSalaryMax) * 100);
    }
  }

  factors.push({
    name: "salary_fit",
    weight: 0.20,
    score: Math.round(salaryScore),
    details: candidateSalary ? `€${candidateSalary.toLocaleString()} vs €${jobSalaryMin?.toLocaleString()}-${jobSalaryMax?.toLocaleString()}` : "Unknown",
  });

  // Location fit
  const locationScore = candidate.preferred_location === job.location_type ? 100 : 
    (job.location_type === "remote" || job.location_type === "hybrid") ? 80 : 40;

  factors.push({
    name: "location_fit",
    weight: 0.10,
    score: locationScore,
    details: `${candidate.preferred_location || "Any"} vs ${job.location_type}`,
  });

  // Industry experience (for enhanced match)
  if (enhanced) {
    const companyIndustry = (job.companies as any)?.industry;
    const industryExp = candidateExp.filter((e: any) => 
      e.industry?.toLowerCase() === companyIndustry?.toLowerCase()
    ).length;
    const industryScore = Math.min(100, industryExp * 25);

    factors.push({
      name: "industry_experience",
      weight: 0.10,
      score: industryScore,
      details: `${industryExp} roles in ${companyIndustry || "unknown"}`,
    });
  }

  // Calculate overall score
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const overallScore = factors.reduce((sum, f) => sum + (f.score * f.weight), 0) / totalWeight;
  
  // Confidence based on data completeness
  const dataPoints = [
    candidateSkills.size > 0,
    candidateExp.length > 0,
    !!candidateSalary,
    !!candidate.preferred_location,
    jobSkills.length > 0,
    !!job.salary_min,
  ];
  const confidence = (dataPoints.filter(Boolean).length / dataPoints.length) * 100;

  // Generate recommendation
  let recommendation = "";
  if (overallScore >= 80) {
    recommendation = "Strong match - prioritize outreach";
  } else if (overallScore >= 60) {
    recommendation = "Good potential - review profile details";
  } else if (overallScore >= 40) {
    recommendation = "Partial match - assess transferable skills";
  } else {
    recommendation = "Low match - consider only if pipeline is thin";
  }

  return {
    score: Math.round(overallScore),
    confidence: Math.round(confidence),
    factors,
    recommendation,
  };
}

async function calculateMoveProbability(
  ctx: MetricsContext,
  candidateId: string
): Promise<MatchResult> {
  const { data: candidate } = await ctx.supabase
    .from("profiles")
    .select("*, candidate_experience(*)")
    .eq("id", candidateId)
    .single();

  if (!candidate) {
    return { score: 0, confidence: 0, factors: [], recommendation: "Candidate not found" };
  }

  const factors: MatchFactor[] = [];

  // Time in current role
  const currentExp = (candidate.candidate_experience || [])
    .find((e: any) => !e.end_date);
  
  let tenureScore = 50;
  if (currentExp?.start_date) {
    const months = (new Date().getTime() - new Date(currentExp.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    // Higher probability if 18-36 months (typical move window)
    if (months >= 18 && months <= 36) {
      tenureScore = 85;
    } else if (months > 36 && months <= 48) {
      tenureScore = 70;
    } else if (months > 48) {
      tenureScore = 60;
    } else if (months < 12) {
      tenureScore = 30;
    }
  }

  factors.push({
    name: "tenure_signal",
    weight: 0.30,
    score: tenureScore,
    details: currentExp?.start_date ? `${Math.round((new Date().getTime() - new Date(currentExp.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))} months in current role` : "Unknown",
  });

  // Profile activity
  const lastActive = candidate.updated_at ? new Date(candidate.updated_at) : null;
  let activityScore = 30;
  if (lastActive) {
    const daysSinceUpdate = (new Date().getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 7) activityScore = 100;
    else if (daysSinceUpdate < 30) activityScore = 80;
    else if (daysSinceUpdate < 90) activityScore = 50;
  }

  factors.push({
    name: "profile_activity",
    weight: 0.25,
    score: activityScore,
    details: lastActive ? `Last active ${Math.round((new Date().getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))} days ago` : "Unknown",
  });

  // Open to opportunities (explicit signal)
  const openScore = candidate.open_to_opportunities ? 100 : 40;
  factors.push({
    name: "open_to_opportunities",
    weight: 0.30,
    score: openScore,
    details: candidate.open_to_opportunities ? "Actively looking" : "Not specified",
  });

  // Career trajectory (promotions/lateral moves)
  const expHistory = candidate.candidate_experience || [];
  const avgTenure = expHistory.length > 1
    ? expHistory.slice(0, -1).reduce((sum: number, e: any) => {
        if (e.start_date && e.end_date) {
          return sum + (new Date(e.end_date).getTime() - new Date(e.start_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
        }
        return sum;
      }, 0) / (expHistory.length - 1)
    : 3;

  const mobilityScore = avgTenure < 2 ? 80 : avgTenure < 3 ? 70 : avgTenure < 4 ? 50 : 30;
  factors.push({
    name: "historical_mobility",
    weight: 0.15,
    score: mobilityScore,
    details: `Average tenure: ${avgTenure.toFixed(1)} years`,
  });

  const overallScore = factors.reduce((sum, f) => sum + (f.score * f.weight), 0);
  const confidence = 75; // Based on available data

  let recommendation = "";
  if (overallScore >= 75) {
    recommendation = "High likelihood to move - engage now";
  } else if (overallScore >= 55) {
    recommendation = "Moderate interest - nurture relationship";
  } else {
    recommendation = "Low probability - keep in talent pool";
  }

  return {
    score: Math.round(overallScore),
    confidence,
    factors,
    recommendation,
  };
}

async function calculateHiringIntent(
  ctx: MetricsContext,
  companyId: string
): Promise<MatchResult> {
  const factors: MatchFactor[] = [];

  // Active job postings
  const { count: activeJobs } = await ctx.supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "active");

  const jobsScore = Math.min(100, (activeJobs || 0) * 20);
  factors.push({
    name: "active_job_postings",
    weight: 0.35,
    score: jobsScore,
    details: `${activeJobs || 0} active positions`,
  });

  // Recent interactions
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: interactions } = await ctx.supabase
    .from("company_interactions")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("created_at", thirtyDaysAgo);

  const interactionScore = Math.min(100, (interactions || 0) * 10);
  factors.push({
    name: "engagement_level",
    weight: 0.25,
    score: interactionScore,
    details: `${interactions || 0} interactions in last 30 days`,
  });

  // Hiring velocity (recent hires)
  const { count: recentHires } = await ctx.supabase
    .from("applications")
    .select("*, jobs!inner(company_id)", { count: "exact", head: true })
    .eq("jobs.company_id", companyId)
    .eq("status", "hired")
    .gte("updated_at", thirtyDaysAgo);

  const velocityScore = Math.min(100, (recentHires || 0) * 30);
  factors.push({
    name: "hiring_velocity",
    weight: 0.25,
    score: velocityScore,
    details: `${recentHires || 0} hires in last 30 days`,
  });

  // Company growth signals
  const { data: company } = await ctx.supabase
    .from("companies")
    .select("employee_count, funding_stage")
    .eq("id", companyId)
    .single();

  let growthScore = 50;
  if (company?.funding_stage) {
    const growthStages = ["series_a", "series_b", "series_c", "growth"];
    if (growthStages.includes(company.funding_stage.toLowerCase())) {
      growthScore = 85;
    }
  }

  factors.push({
    name: "growth_stage",
    weight: 0.15,
    score: growthScore,
    details: company?.funding_stage || "Unknown stage",
  });

  const overallScore = factors.reduce((sum, f) => sum + (f.score * f.weight), 0);

  let recommendation = "";
  if (overallScore >= 75) {
    recommendation = "High hiring intent - prioritize outreach";
  } else if (overallScore >= 50) {
    recommendation = "Moderate intent - maintain relationship";
  } else {
    recommendation = "Low current intent - nurture for future";
  }

  return {
    score: Math.round(overallScore),
    confidence: 70,
    factors,
    recommendation,
  };
}

async function calculateStakeholderInfluence(
  ctx: MetricsContext,
  companyId: string,
  stakeholderId?: string
): Promise<Record<string, MatchResult>> {
  const results: Record<string, MatchResult> = {};

  // Get stakeholders
  let query = ctx.supabase
    .from("company_stakeholders")
    .select("*")
    .eq("company_id", companyId);

  if (stakeholderId) {
    query = query.eq("id", stakeholderId);
  }

  const { data: stakeholders } = await query;

  for (const stakeholder of stakeholders || []) {
    const factors: MatchFactor[] = [];

    // Seniority score
    const seniorityMap: Record<string, number> = {
      "c-level": 100,
      "vp": 85,
      "director": 70,
      "manager": 50,
      "individual": 30,
    };
    const seniorityScore = seniorityMap[stakeholder.seniority?.toLowerCase()] || 50;
    factors.push({
      name: "seniority",
      weight: 0.30,
      score: seniorityScore,
      details: stakeholder.seniority || "Unknown",
    });

    // Interaction frequency
    const { count: interactions } = await ctx.supabase
      .from("interaction_participants")
      .select("*", { count: "exact", head: true })
      .eq("stakeholder_id", stakeholder.id);

    const interactionScore = Math.min(100, (interactions || 0) * 15);
    factors.push({
      name: "engagement_frequency",
      weight: 0.25,
      score: interactionScore,
      details: `${interactions || 0} recorded interactions`,
    });

    // Decision maker flag
    const decisionScore = stakeholder.is_decision_maker ? 100 : 30;
    factors.push({
      name: "decision_authority",
      weight: 0.30,
      score: decisionScore,
      details: stakeholder.is_decision_maker ? "Confirmed decision maker" : "Not confirmed",
    });

    // Relationship strength
    const relationshipScore = stakeholder.relationship_score || 50;
    factors.push({
      name: "relationship_quality",
      weight: 0.15,
      score: relationshipScore,
      details: `Score: ${relationshipScore}/100`,
    });

    const overallScore = factors.reduce((sum, f) => sum + (f.score * f.weight), 0);

    let recommendation = "";
    if (overallScore >= 75) {
      recommendation = "Key influencer - prioritize relationship";
    } else if (overallScore >= 50) {
      recommendation = "Important contact - maintain engagement";
    } else {
      recommendation = "Secondary contact - keep informed";
    }

    results[stakeholder.id] = {
      score: Math.round(overallScore),
      confidence: 65,
      factors,
      recommendation,
    };
  }

  return results;
}
