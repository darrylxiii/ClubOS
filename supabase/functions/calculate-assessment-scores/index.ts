import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssessmentDimension {
  score: number;
  confidence: number;
  sources: string[];
  details?: string;
}

interface AssessmentBreakdown {
  skills_match: AssessmentDimension;
  experience: AssessmentDimension;
  engagement: AssessmentDimension;
  culture_fit: AssessmentDimension;
  salary_match: AssessmentDimension;
  location_match: AssessmentDimension;
  overall_score: number;
  overall_confidence: number;
  computed_at: string;
  job_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { candidate_id, job_id } = await req.json();
    if (!candidate_id) {
      return new Response(JSON.stringify({ error: "candidate_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch candidate data
    const { data: candidate } = await supabase
      .from("candidate_profiles")
      .select("*")
      .eq("id", candidate_id)
      .single();

    if (!candidate) {
      return new Response(JSON.stringify({ error: "Candidate not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch supporting data in parallel
    const [
      { data: profileSkills },
      { data: interviewFeedback },
      { data: interactions },
      { data: applicationLogs },
      { data: taxonomy },
    ] = await Promise.all([
      supabase.from("profile_skills").select("*").eq("user_id", candidate_id),
      supabase.from("interview_feedback").select("*").eq("application_id", candidate_id),
      supabase.from("candidate_interactions").select("*").eq("candidate_id", candidate_id),
      supabase.from("candidate_application_logs").select("*").eq("candidate_profile_id", candidate_id),
      supabase.from("skills_taxonomy").select("canonical_name, synonyms, display_name"),
    ]);

    // Also fetch interview feedback via applications
    const { data: applications } = await supabase
      .from("applications")
      .select("id")
      .eq("candidate_id", candidate_id);

    let allFeedback = interviewFeedback || [];
    if (applications && applications.length > 0) {
      const appIds = applications.map((a: any) => a.id);
      const { data: appFeedback } = await supabase
        .from("interview_feedback")
        .select("*")
        .in("application_id", appIds);
      if (appFeedback) {
        allFeedback = [...allFeedback, ...appFeedback];
      }
    }

    // Fetch job data if job_id provided
    let job: any = null;
    if (job_id) {
      const { data: jobData } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", job_id)
        .single();
      job = jobData;
    }

    // ===== COMPUTE EACH DIMENSION =====

    // 1. SKILLS MATCH
    const skillsMatch = computeSkillsMatch(candidate, profileSkills || [], job, taxonomy || []);

    // 2. EXPERIENCE
    const experience = computeExperience(candidate, job);

    // 3. ENGAGEMENT
    const engagement = computeEngagement(candidate, interactions || [], applicationLogs || []);

    // 4. CULTURE FIT
    const cultureFit = computeCultureFit(allFeedback);

    // 5. SALARY MATCH
    const salaryMatch = computeSalaryMatch(candidate, job);

    // 6. LOCATION MATCH
    const locationMatch = computeLocationMatch(candidate, job);

    // Calculate overall
    const dimensions = [skillsMatch, experience, engagement, cultureFit, salaryMatch, locationMatch];
    const scoredDimensions = dimensions.filter((d) => d.confidence > 0.1);
    const overallScore =
      scoredDimensions.length > 0
        ? Math.round(scoredDimensions.reduce((sum, d) => sum + d.score, 0) / scoredDimensions.length)
        : 0;
    const overallConfidence =
      scoredDimensions.length > 0
        ? Math.round((scoredDimensions.reduce((sum, d) => sum + d.confidence, 0) / dimensions.length) * 100) / 100
        : 0;

    const breakdown: AssessmentBreakdown = {
      skills_match: skillsMatch,
      experience,
      engagement,
      culture_fit: cultureFit,
      salary_match: salaryMatch,
      location_match: locationMatch,
      overall_score: overallScore,
      overall_confidence: overallConfidence,
      computed_at: new Date().toISOString(),
      job_id: job_id || undefined,
    };

    // Write back to candidate_profiles
    await supabase
      .from("candidate_profiles")
      .update({
        assessment_breakdown: breakdown,
        assessment_computed_at: new Date().toISOString(),
        fit_score: Math.round(skillsMatch.score / 10),
        engagement_score: Math.round(engagement.score / 10),
      })
      .eq("id", candidate_id);

    return new Response(JSON.stringify({ success: true, breakdown }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Assessment calculation error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function computeSkillsMatch(
  candidate: any,
  profileSkills: any[],
  job: any | null,
  taxonomy: any[]
): AssessmentDimension {
  // Gather candidate skills from all sources
  const candidateSkillNames = new Set<string>();
  
  // From profile_skills table
  profileSkills.forEach((s) => {
    if (s.skill_name) candidateSkillNames.add(s.skill_name.toLowerCase().trim());
  });
  
  // From candidate_profiles.skills JSONB
  if (candidate.skills) {
    const skillsArr = Array.isArray(candidate.skills) ? candidate.skills : [];
    skillsArr.forEach((s: any) => {
      const name = typeof s === "string" ? s : s?.name || s?.skill;
      if (name) candidateSkillNames.add(name.toLowerCase().trim());
    });
  }

  if (candidateSkillNames.size === 0) {
    return { score: 0, confidence: 0, sources: [], details: "No skills data available" };
  }

  // Build synonym map from taxonomy
  const synonymMap = new Map<string, string>();
  taxonomy.forEach((t) => {
    const canonical = (t.canonical_name || t.display_name || "").toLowerCase().trim();
    if (canonical) {
      synonymMap.set(canonical, canonical);
      if (t.synonyms && Array.isArray(t.synonyms)) {
        t.synonyms.forEach((syn: string) => {
          synonymMap.set(syn.toLowerCase().trim(), canonical);
        });
      }
    }
  });

  // Normalize candidate skills using taxonomy
  const normalizedCandidateSkills = new Set<string>();
  candidateSkillNames.forEach((skill) => {
    normalizedCandidateSkills.add(synonymMap.get(skill) || skill);
  });

  if (!job) {
    // No job context - return based on profile richness
    const richness = Math.min(100, candidateSkillNames.size * 8);
    return {
      score: richness,
      confidence: 0.3,
      sources: ["profile_skills", "candidate_profile"],
      details: `${candidateSkillNames.size} skills on profile (no job to compare against)`,
    };
  }

  // Compare against job requirements
  const jobRequirements: string[] = [];
  if (job.requirements) {
    const reqs = Array.isArray(job.requirements) ? job.requirements : [];
    reqs.forEach((r: any) => {
      const name = typeof r === "string" ? r : r?.name || r?.skill || r?.label;
      if (name) jobRequirements.push(name.toLowerCase().trim());
    });
  }

  if (jobRequirements.length === 0) {
    return {
      score: Math.min(100, candidateSkillNames.size * 8),
      confidence: 0.2,
      sources: ["profile_skills"],
      details: "Job has no requirements listed",
    };
  }

  // Normalize job requirements
  const normalizedReqs = jobRequirements.map((r) => synonymMap.get(r) || r);

  let matchedCount = 0;
  normalizedReqs.forEach((req) => {
    if (normalizedCandidateSkills.has(req)) matchedCount++;
  });

  const score = Math.round((matchedCount / normalizedReqs.length) * 100);
  return {
    score,
    confidence: 0.8,
    sources: ["profile_skills", "skills_taxonomy", "job_requirements"],
    details: `${matchedCount}/${normalizedReqs.length} required skills matched`,
  };
}

function computeExperience(candidate: any, job: any | null): AssessmentDimension {
  const yoe = candidate.years_of_experience;
  if (!yoe && yoe !== 0) {
    return { score: 0, confidence: 0, sources: [], details: "No experience data" };
  }

  if (!job) {
    // General experience score - bell curve centered at 8 years
    const idealYears = 8;
    const diff = Math.abs(yoe - idealYears);
    const score = Math.max(0, Math.round(100 - diff * 5));
    return {
      score,
      confidence: 0.5,
      sources: ["candidate_profile"],
      details: `${yoe} years experience`,
    };
  }

  // With job context, estimate expected experience from title/level
  const title = (job.title || "").toLowerCase();
  let expectedYears = 5;
  if (title.includes("senior") || title.includes("sr.")) expectedYears = 7;
  else if (title.includes("lead") || title.includes("principal")) expectedYears = 10;
  else if (title.includes("junior") || title.includes("jr.")) expectedYears = 2;
  else if (title.includes("head") || title.includes("director") || title.includes("vp")) expectedYears = 12;

  const diff = Math.abs(yoe - expectedYears);
  const score = Math.max(0, Math.round(100 - diff * 8));
  return {
    score,
    confidence: 0.6,
    sources: ["candidate_profile", "job_seniority"],
    details: `${yoe} years vs ~${expectedYears} expected`,
  };
}

function computeEngagement(candidate: any, interactions: any[], applicationLogs: any[]): AssessmentDimension {
  const sources: string[] = [];
  let totalScore = 0;
  let weights = 0;

  // Interaction frequency (last 90 days)
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  const recentInteractions = interactions.filter(
    (i) => new Date(i.created_at).getTime() > ninetyDaysAgo
  );
  if (interactions.length > 0) {
    const interactionScore = Math.min(100, recentInteractions.length * 15);
    totalScore += interactionScore * 0.3;
    weights += 0.3;
    sources.push("candidate_interactions");
  }

  // Application activity
  const recentLogs = applicationLogs.filter(
    (l) => new Date(l.created_at).getTime() > ninetyDaysAgo
  );
  if (applicationLogs.length > 0) {
    const logScore = Math.min(100, recentLogs.length * 10);
    totalScore += logScore * 0.25;
    weights += 0.25;
    sources.push("application_logs");
  }

  // Profile completeness
  const completeness = candidate.profile_completeness || 0;
  if (completeness > 0) {
    totalScore += completeness * 0.25;
    weights += 0.25;
    sources.push("profile_completeness");
  }

  // Login recency
  const lastActivity = candidate.last_activity_at || candidate.updated_at;
  if (lastActivity) {
    const daysSince = (now - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
    let recencyScore = 0;
    if (daysSince < 2) recencyScore = 100;
    else if (daysSince < 7) recencyScore = 80;
    else if (daysSince < 14) recencyScore = 60;
    else if (daysSince < 30) recencyScore = 40;
    else recencyScore = 20;
    totalScore += recencyScore * 0.2;
    weights += 0.2;
    sources.push("last_activity");
  }

  if (weights === 0) {
    return { score: 0, confidence: 0, sources: [], details: "No engagement data" };
  }

  return {
    score: Math.round(totalScore / weights),
    confidence: Math.min(1, weights / 0.7),
    sources,
    details: `${recentInteractions.length} interactions, ${recentLogs.length} log entries (90d)`,
  };
}

function computeCultureFit(feedback: any[]): AssessmentDimension {
  const cultureFitScores = feedback
    .filter((f) => f.culture_fit_score != null && f.culture_fit_score > 0)
    .map((f) => f.culture_fit_score);

  if (cultureFitScores.length === 0) {
    return {
      score: 0,
      confidence: 0,
      sources: [],
      details: "No interview culture fit data",
    };
  }

  const avg = cultureFitScores.reduce((a: number, b: number) => a + b, 0) / cultureFitScores.length;
  // Scale from 1-10 to 0-100
  const score = Math.round(avg * 10);

  return {
    score: Math.min(100, score),
    confidence: Math.min(1, cultureFitScores.length * 0.3),
    sources: ["interview_feedback"],
    details: `Based on ${cultureFitScores.length} interview${cultureFitScores.length > 1 ? "s" : ""} (avg: ${avg.toFixed(1)}/10)`,
  };
}

function computeSalaryMatch(candidate: any, job: any | null): AssessmentDimension {
  const candidateMin = candidate.desired_salary_min;
  const candidateMax = candidate.desired_salary_max;

  if (!candidateMin && !candidateMax) {
    return { score: 0, confidence: 0, sources: [], details: "No salary expectation data" };
  }

  if (!job || (!job.salary_min && !job.salary_max)) {
    return {
      score: 50,
      confidence: 0.1,
      sources: ["candidate_profile"],
      details: "No job salary data to compare",
    };
  }

  const jobMin = job.salary_min || 0;
  const jobMax = job.salary_max || jobMin * 1.5;
  const cMin = candidateMin || candidateMax;
  const cMax = candidateMax || candidateMin;

  // Calculate overlap
  const overlapStart = Math.max(jobMin, cMin);
  const overlapEnd = Math.min(jobMax, cMax);

  if (overlapStart <= overlapEnd) {
    // There's overlap
    const overlapSize = overlapEnd - overlapStart;
    const candidateRange = cMax - cMin || 1;
    const jobRange = jobMax - jobMin || 1;
    const overlapRatio = overlapSize / Math.min(candidateRange, jobRange);
    const score = Math.round(Math.min(100, 60 + overlapRatio * 40));
    return {
      score,
      confidence: 0.8,
      sources: ["candidate_salary", "job_salary"],
      details: `Overlap: ${Math.round(overlapStart / 1000)}K-${Math.round(overlapEnd / 1000)}K`,
    };
  }

  // No overlap - measure gap
  const gap = overlapStart - overlapEnd;
  const midJob = (jobMin + jobMax) / 2;
  const gapPercent = (gap / midJob) * 100;
  const score = Math.max(0, Math.round(60 - gapPercent * 2));

  return {
    score,
    confidence: 0.7,
    sources: ["candidate_salary", "job_salary"],
    details: `Gap: ${Math.round(gap / 1000)}K apart`,
  };
}

function computeLocationMatch(candidate: any, job: any | null): AssessmentDimension {
  const remotePref = candidate.remote_preference;
  const desiredLocations = candidate.desired_locations;

  if (!remotePref && (!desiredLocations || (Array.isArray(desiredLocations) && desiredLocations.length === 0))) {
    return { score: 0, confidence: 0, sources: [], details: "No location preference data" };
  }

  if (!job) {
    return {
      score: 50,
      confidence: 0.1,
      sources: ["candidate_profile"],
      details: "No job to compare against",
    };
  }

  const jobLocation = (job.location || "").toLowerCase();
  const employmentType = (job.employment_type || "").toLowerCase();
  const isJobRemote = jobLocation.includes("remote") || employmentType.includes("remote");
  const isJobHybrid = jobLocation.includes("hybrid") || employmentType.includes("hybrid");
  const candidateWantsRemote = remotePref === "remote" || remotePref === "fully_remote";
  const candidateWantsHybrid = remotePref === "hybrid";

  // Remote match
  if (isJobRemote && candidateWantsRemote) {
    return { score: 100, confidence: 0.9, sources: ["location_match"], details: "Both remote" };
  }
  if (isJobRemote && candidateWantsHybrid) {
    return { score: 90, confidence: 0.8, sources: ["location_match"], details: "Job remote, candidate hybrid" };
  }
  if (isJobHybrid && candidateWantsRemote) {
    return { score: 70, confidence: 0.7, sources: ["location_match"], details: "Job hybrid, candidate remote" };
  }
  if (isJobHybrid && candidateWantsHybrid) {
    return { score: 95, confidence: 0.9, sources: ["location_match"], details: "Both hybrid" };
  }

  // Location-based match
  if (desiredLocations && Array.isArray(desiredLocations)) {
    const normalizedLocations = desiredLocations.map((l: string) => l.toLowerCase().trim());
    if (normalizedLocations.some((l: string) => jobLocation.includes(l) || l.includes(jobLocation))) {
      return { score: 90, confidence: 0.8, sources: ["location_match"], details: "Location match found" };
    }
  }

  // Default: some mismatch
  return {
    score: 30,
    confidence: 0.5,
    sources: ["location_match"],
    details: "No clear location alignment",
  };
}
