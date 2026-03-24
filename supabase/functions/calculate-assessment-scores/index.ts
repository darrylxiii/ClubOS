import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

// Remote/Hybrid/Onsite scoring matrix
const LOCATION_MATRIX: Record<string, Record<string, number>> = {
  remote:  { remote: 100, hybrid: 70, onsite: 30 },
  hybrid:  { remote: 90,  hybrid: 95, onsite: 60 },
  onsite:  { remote: 50,  hybrid: 70, onsite: 100 },
};

// Seniority to expected years mapping
const SENIORITY_YEARS: Record<string, number> = {
  intern: 0, junior: 2, mid: 4, 'mid-senior': 6, senior: 8,
  lead: 10, principal: 12, staff: 12, head: 14, director: 15, vp: 18, 'c-level': 20,
};

// Salary period multipliers to annual
const SALARY_MULTIPLIERS: Record<string, number> = {
  annual: 1, monthly: 12, daily: 220, hourly: 1760,
};

// Seniority-based salary medians (EUR, annual) for fallback
const SENIORITY_SALARY_MEDIANS: Record<string, { min: number; max: number }> = {
  intern: { min: 20000, max: 30000 },
  junior: { min: 35000, max: 50000 },
  mid: { min: 50000, max: 70000 },
  'mid-senior': { min: 60000, max: 85000 },
  senior: { min: 70000, max: 100000 },
  lead: { min: 85000, max: 120000 },
  principal: { min: 100000, max: 140000 },
  staff: { min: 100000, max: 140000 },
  head: { min: 110000, max: 150000 },
  director: { min: 120000, max: 170000 },
  vp: { min: 140000, max: 200000 },
  'c-level': { min: 160000, max: 250000 },
};

// Proficiency level weights for skills matching
const PROFICIENCY_WEIGHTS: Record<string, number> = {
  expert: 1.0, advanced: 1.0, senior: 1.0,
  intermediate: 0.7, mid: 0.7,
  beginner: 0.4, junior: 0.4, novice: 0.4,
};

// Dimension weights for confidence-weighted overall
const DIMENSION_WEIGHTS: Record<string, number> = {
  skills_match: 0.25,
  experience: 0.20,
  engagement: 0.15,
  culture_fit: 0.15,
  salary_match: 0.15,
  location_match: 0.10,
};

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
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch candidate
    const { data: candidate } = await supabase
      .from("candidate_profiles")
      .select("*")
      .eq("id", candidate_id)
      .single();

    if (!candidate) {
      return new Response(JSON.stringify({ error: "Candidate not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all supporting data in parallel — including NEW intelligence tables
    const [
      { data: profileSkills },
      { data: interactions },
      { data: applicationLogs },
      { data: taxonomy },
      { data: applications },
      { data: communications },
      { data: profileExperience },
      { data: interviewIntelligence },
      { data: interviewPerformance },
      { data: meetingParticipants },
      { data: valuesPokerSessions },
    ] = await Promise.all([
      supabase.from("profile_skills").select("*").eq("user_id", candidate_id),
      supabase.from("candidate_interactions").select("*").eq("candidate_id", candidate_id),
      supabase.from("candidate_application_logs").select("*").eq("candidate_profile_id", candidate_id),
      supabase.from("skills_taxonomy").select("canonical_name, synonyms, display_name"),
      supabase.from("applications").select("id").eq("candidate_id", candidate_id),
      supabase.from("unified_communications").select("original_timestamp, direction, channel")
        .eq("entity_id", candidate_id).order("original_timestamp", { ascending: true }).limit(100),
      supabase.from("profile_experience").select("*").eq("user_id", candidate_id).order("start_date", { ascending: false }),
      // NEW: Interview intelligence (AI-computed scores from meetings)
      supabase.from("interview_intelligence").select("culture_fit_score, technical_depth_score, communication_clarity_score, overall_score, meeting_id, created_at")
        .eq("candidate_id", candidate_id),
      // NEW: Candidate interview performance (structured performance data)
      supabase.from("candidate_interview_performance").select("cultural_fit_score, technical_competence_score, communication_clarity_score, hiring_recommendation, key_strengths, red_flags")
        .eq("candidate_id", candidate_id),
      // NEW: Meeting participants (attendance tracking) — use user_id if candidate has one
      candidate.user_id
        ? supabase.from("meeting_participants").select("id, attended, joined_at, left_at").eq("user_id", candidate.user_id).eq("attended", true)
        : Promise.resolve({ data: [] }),
      // NEW: Values poker sessions (culture assessment games)
      candidate.user_id
        ? supabase.from("values_poker_sessions").select("culture_fit_scores, consistency_score, value_archetype, red_flags").eq("user_id", candidate.user_id)
        : Promise.resolve({ data: [] }),
    ]);

    // Fetch interview feedback via applications
    let allFeedback: any[] = [];
    if (applications && applications.length > 0) {
      const appIds = applications.map((a: any) => a.id);
      const { data: appFeedback } = await supabase
        .from("interview_feedback")
        .select("*")
        .in("application_id", appIds);
      allFeedback = appFeedback || [];
    }

    // Fetch job data + job_locations if job_id provided
    let job: any = null;
    let jobLocations: any[] = [];
    if (job_id) {
      const [{ data: jobData }, { data: jl }] = await Promise.all([
        supabase.from("jobs").select("*").eq("id", job_id).single(),
        supabase.from("job_locations").select("*").eq("job_id", job_id),
      ]);
      job = jobData;
      jobLocations = jl || [];
    }

    // Bundle intelligence data for compute functions
    const intelligence = {
      interviewIntelligence: interviewIntelligence || [],
      interviewPerformance: interviewPerformance || [],
      meetingParticipants: meetingParticipants || [],
      valuesPokerSessions: valuesPokerSessions || [],
    };

    // ===== COMPUTE EACH DIMENSION =====
    const skillsMatch = computeSkillsMatch(candidate, profileSkills || [], job, taxonomy || [], intelligence);
    const experience = computeExperience(candidate, job, profileExperience || []);
    const engagement = computeEngagement(candidate, interactions || [], applicationLogs || [], communications || [], intelligence);
    const cultureFit = computeCultureFit(candidate, allFeedback, intelligence);
    const salaryMatch = computeSalaryMatch(candidate, job);
    const locationMatch = computeLocationMatch(candidate, job, jobLocations);

    // Confidence-weighted overall score
    const dimensionEntries: { key: string; dim: AssessmentDimension }[] = [
      { key: 'skills_match', dim: skillsMatch },
      { key: 'experience', dim: experience },
      { key: 'engagement', dim: engagement },
      { key: 'culture_fit', dim: cultureFit },
      { key: 'salary_match', dim: salaryMatch },
      { key: 'location_match', dim: locationMatch },
    ];

    let weightedSum = 0;
    let weightedDenom = 0;
    for (const { key, dim } of dimensionEntries) {
      if (dim.confidence < 0.1) continue;
      const w = DIMENSION_WEIGHTS[key] || 0.15;
      weightedSum += dim.score * dim.confidence * w;
      weightedDenom += dim.confidence * w;
    }

    const overallScore = weightedDenom > 0 ? Math.round(weightedSum / weightedDenom) : 0;
    const overallConfidence = weightedDenom > 0
      ? Math.round((dimensionEntries.filter(e => e.dim.confidence > 0.1).reduce((s, e) => s + e.dim.confidence, 0) / dimensionEntries.length) * 100) / 100
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

    // Write back
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
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ==================== SKILLS MATCH ====================
function computeSkillsMatch(
  candidate: any, profileSkills: any[], job: any | null, taxonomy: any[],
  intelligence: any
): AssessmentDimension {
  // Gather candidate skills from all sources with proficiency weights
  const candidateSkillNames = new Set<string>();
  const skillProficiency = new Map<string, number>(); // skill -> weight (0-1)

  profileSkills.forEach((s) => {
    if (s.skill_name) {
      const name = s.skill_name.toLowerCase().trim();
      candidateSkillNames.add(name);
      // Use proficiency_level for weighting
      const prof = (s.proficiency_level || '').toLowerCase();
      skillProficiency.set(name, PROFICIENCY_WEIGHTS[prof] || 0.7);
    }
  });

  if (candidate.skills) {
    const arr = Array.isArray(candidate.skills) ? candidate.skills : [];
    arr.forEach((s: any) => {
      const name = typeof s === "string" ? s : s?.name || s?.skill;
      if (name) {
        const lower = name.toLowerCase().trim();
        candidateSkillNames.add(lower);
        if (!skillProficiency.has(lower)) skillProficiency.set(lower, 0.7);
      }
    });
  }

  // Also extract keywords from work_history titles as fallback
  if (candidateSkillNames.size === 0 && candidate.work_history) {
    const wh = Array.isArray(candidate.work_history) ? candidate.work_history : [];
    wh.forEach((w: any) => {
      const title = (w.title || w.job_title || '').toLowerCase();
      const keywords = title.split(/[\s,/\-&]+/).filter((k: string) => k.length > 2);
      keywords.forEach((k: string) => {
        candidateSkillNames.add(k);
        skillProficiency.set(k, 0.5);
      });
    });
  }

  if (candidateSkillNames.size === 0) {
    return { score: 0, confidence: 0, sources: [], details: "No skills data available. Enrich profile to compute." };
  }

  // Build synonym map
  const synonymMap = new Map<string, string>();
  taxonomy.forEach((t) => {
    const canonical = (t.canonical_name || t.display_name || "").toLowerCase().trim();
    if (canonical) {
      synonymMap.set(canonical, canonical);
      const syns = Array.isArray(t.synonyms) ? t.synonyms : [];
      syns.forEach((syn: string) => {
        if (syn) synonymMap.set(syn.toLowerCase().trim(), canonical);
      });
    }
  });

  // Normalize candidate skills
  const normalizedCandidate = new Map<string, number>(); // canonical -> proficiency weight
  candidateSkillNames.forEach((skill) => {
    const canonical = synonymMap.get(skill) || skill;
    const prof = skillProficiency.get(skill) || 0.7;
    normalizedCandidate.set(canonical, Math.max(normalizedCandidate.get(canonical) || 0, prof));
  });

  if (!job) {
    const richness = Math.min(100, candidateSkillNames.size * 6);
    return {
      score: richness,
      confidence: 0.3,
      sources: ["profile_skills", "candidate_profile"],
      details: `${candidateSkillNames.size} skills on profile (no job to compare)`,
    };
  }

  // Get must-have requirements
  const mustHave: string[] = [];
  if (job.requirements && Array.isArray(job.requirements)) {
    job.requirements.forEach((r: any) => {
      const name = typeof r === "string" ? r : r?.name || r?.skill || r?.label;
      if (name) mustHave.push(name.toLowerCase().trim());
    });
  }

  // Get nice-to-have
  const niceToHave: string[] = [];
  if (job.nice_to_have && Array.isArray(job.nice_to_have)) {
    job.nice_to_have.forEach((r: any) => {
      const name = typeof r === "string" ? r : r?.name || r?.skill || r?.label;
      if (name) niceToHave.push(name.toLowerCase().trim());
    });
  }

  if (mustHave.length === 0 && niceToHave.length === 0) {
    return {
      score: Math.min(100, candidateSkillNames.size * 6),
      confidence: 0.2,
      sources: ["profile_skills"],
      details: "Job has no parsed requirements. Run requirement extraction.",
    };
  }

  // Normalize job requirements
  const normMustHave = mustHave.map((r) => synonymMap.get(r) || r);
  const normNiceToHave = niceToHave.map((r) => synonymMap.get(r) || r);

  // Proficiency-weighted match: a match with expert proficiency counts more
  let mustMatchWeight = 0;
  let mustTotalWeight = 0;
  for (const req of normMustHave) {
    mustTotalWeight += 1;
    if (normalizedCandidate.has(req)) {
      mustMatchWeight += normalizedCandidate.get(req)!;
    }
  }

  let niceMatchWeight = 0;
  let niceTotalWeight = 0;
  for (const req of normNiceToHave) {
    niceTotalWeight += 1;
    if (normalizedCandidate.has(req)) {
      niceMatchWeight += normalizedCandidate.get(req)!;
    }
  }

  const mustScore = mustTotalWeight > 0 ? (mustMatchWeight / mustTotalWeight) : 1;
  const niceScore = niceTotalWeight > 0 ? (niceMatchWeight / niceTotalWeight) : 0.5;

  // Base score from keyword matching
  let score = Math.round((mustScore * 0.7 + niceScore * 0.3) * 100);

  const sources = ["profile_skills", "skills_taxonomy", "job_requirements"];
  const matchedMust = normMustHave.filter((r) => normalizedCandidate.has(r)).length;
  const matchedNice = normNiceToHave.filter((r) => normalizedCandidate.has(r)).length;
  const missingMust = normMustHave.length - matchedMust;

  // Supplement with interview intelligence technical scores (10% weight)
  const techScores: number[] = [];
  for (const ii of intelligence.interviewIntelligence) {
    if (ii.technical_depth_score != null && ii.technical_depth_score > 0) {
      techScores.push(ii.technical_depth_score);
    }
  }
  for (const ip of intelligence.interviewPerformance) {
    if (ip.technical_competence_score != null && ip.technical_competence_score > 0) {
      techScores.push(ip.technical_competence_score);
    }
  }

  if (techScores.length > 0) {
    const avgTech = techScores.reduce((a, b) => a + b, 0) / techScores.length;
    score = Math.round(score * 0.85 + avgTech * 0.15);
    sources.push("interview_intelligence");
  }

  return {
    score: Math.min(100, score),
    confidence: 0.85,
    sources,
    details: `${matchedMust}/${normMustHave.length} must-have, ${matchedNice}/${normNiceToHave.length} nice-to-have${missingMust > 0 ? `. Missing ${missingMust} critical skills` : ''}${techScores.length > 0 ? ` + ${techScores.length} interview tech scores` : ''}`,
  };
}

// ==================== EXPERIENCE ====================
function computeExperience(candidate: any, job: any | null, profileExperience: any[] = []): AssessmentDimension {
  let yoe = candidate.years_of_experience;
  let workHistory = Array.isArray(candidate.work_history) ? candidate.work_history : [];

  // FALLBACK 1: If work_history is empty, build it from profile_experience table
  if (workHistory.length === 0 && profileExperience.length > 0) {
    workHistory = profileExperience.map((pe: any) => ({
      title: pe.position_title || pe.title,
      company: pe.company_name || pe.company,
      start_date: pe.start_date,
      end_date: pe.end_date,
      is_current: pe.is_current,
      description: pe.description,
    }));
  }

  // FALLBACK 2: If work_history is empty, try linkedin_profile_data
  if (workHistory.length === 0 && candidate.linkedin_profile_data) {
    const lpd = typeof candidate.linkedin_profile_data === 'string'
      ? JSON.parse(candidate.linkedin_profile_data)
      : candidate.linkedin_profile_data;
    const exp = lpd?.experience || lpd?.positions || lpd?.work_history || [];
    if (Array.isArray(exp) && exp.length > 0) {
      workHistory = exp.map((e: any) => ({
        title: e.title || e.position_title || e.role,
        company: e.company || e.company_name || e.organization,
        start_date: e.start_date || e.startDate,
        end_date: e.end_date || e.endDate,
        is_current: e.is_current || false,
        description: e.description || e.summary,
      }));
    }
  }

  // FALLBACK 3: Compute years_of_experience from work history dates when field is null
  if ((!yoe || yoe === 0) && workHistory.length > 0) {
    yoe = computeYearsFromWorkHistory(workHistory);
  }

  // FALLBACK 4: Infer from current_title if nothing else
  if (!yoe && yoe !== 0 && workHistory.length === 0) {
    if (candidate.current_title) {
      const title = (candidate.current_title || '').toLowerCase();
      const seniorityMap: Record<string, number> = {
        intern: 0.5, trainee: 1, junior: 2, associate: 3, mid: 4,
        senior: 7, lead: 9, principal: 11, head: 12, director: 14, vp: 16, chief: 18, cto: 18, ceo: 20
      };
      for (const [keyword, years] of Object.entries(seniorityMap)) {
        if (title.includes(keyword)) {
          yoe = years;
          break;
        }
      }
      if (!yoe) yoe = 4; // default mid-level for non-keyword titles
      return {
        score: Math.min(100, Math.max(0, Math.round(100 - Math.abs(yoe - 8) * 4))),
        confidence: 0.2,
        sources: ["current_title_inferred"],
        details: `~${yoe} years inferred from title "${candidate.current_title}". Add work history for accuracy.`,
      };
    }
    return { score: 0, confidence: 0, sources: [], details: "No experience data. Upload a CV or connect LinkedIn." };
  }

  const sources: string[] = [];
  if (workHistory.length > 0) sources.push("work_history");
  if (profileExperience.length > 0) sources.push("profile_experience");
  if (candidate.years_of_experience) sources.push("candidate_profile");

  let details = `${yoe || 0} years experience`;
  if (workHistory.length > 0) details += `, ${workHistory.length} roles`;

  // Detect career progression from work history
  let progressionBonus = 0;
  if (workHistory.length >= 2) {
    const titles = workHistory.map((w: any) => (w.title || w.job_title || w.position_title || '').toLowerCase());
    const seniorityKeywords = ['intern', 'trainee', 'junior', 'mid', 'senior', 'lead', 'principal', 'head', 'director', 'vp', 'cto', 'ceo'];
    const titleLevels = titles.map((t: string) => {
      for (let i = seniorityKeywords.length - 1; i >= 0; i--) {
        if (t.includes(seniorityKeywords[i])) return i;
      }
      return 3; // default mid
    });
    let ascending = 0;
    for (let i = 1; i < titleLevels.length; i++) {
      if (titleLevels[i] > titleLevels[i - 1]) ascending++;
    }
    if (ascending >= 1) {
      progressionBonus = 10;
      details += `, clear career progression`;
      sources.push("work_history_progression");
    }
  }

  if (!job) {
    const idealYears = 8;
    const diff = Math.abs((yoe || 0) - idealYears);
    const score = Math.min(100, Math.max(0, Math.round(100 - diff * 4)) + progressionBonus);
    return { score, confidence: workHistory.length > 0 ? 0.6 : 0.5, sources, details };
  }

  // Use seniority_level and experience_level from job if available
  let expectedYears = 5;
  if (job.seniority_level && SENIORITY_YEARS[job.seniority_level.toLowerCase()]) {
    expectedYears = SENIORITY_YEARS[job.seniority_level.toLowerCase()];
    sources.push("job_seniority_level");
  } else if (job.experience_level && SENIORITY_YEARS[job.experience_level.toLowerCase()]) {
    expectedYears = SENIORITY_YEARS[job.experience_level.toLowerCase()];
    sources.push("job_experience_level");
  } else {
    const title = (job.title || "").toLowerCase();
    if (title.includes("junior") || title.includes("jr.")) expectedYears = 2;
    else if (title.includes("senior") || title.includes("sr.")) expectedYears = 7;
    else if (title.includes("lead") || title.includes("principal")) expectedYears = 10;
    else if (title.includes("head") || title.includes("director") || title.includes("vp")) expectedYears = 12;
    sources.push("job_title_inferred");
  }

  const diff = Math.abs((yoe || 0) - expectedYears);
  const score = Math.min(100, Math.max(0, Math.round(100 - diff * 6)) + progressionBonus);
  details = `${yoe || 0} years vs ~${expectedYears} expected`;
  if (workHistory.length > 0) details += ` (${workHistory.length} roles)`;

  return { score, confidence: workHistory.length > 0 ? 0.8 : 0.7, sources, details };
}

// Helper: compute total years of experience from work history date ranges
function computeYearsFromWorkHistory(workHistory: any[]): number {
  const now = new Date();
  let totalMonths = 0;

  for (const entry of workHistory) {
    const startStr = entry.start_date || entry.startDate;
    const endStr = entry.end_date || entry.endDate;
    const isCurrent = entry.is_current;

    if (!startStr) {
      // If we have duration string like "2 years" or "Jan 2020 - Dec 2022", try to parse
      const durStr = entry.duration || '';
      const yearMatch = durStr.match(/(\d+)\s*(?:year|yr)/i);
      const monthMatch = durStr.match(/(\d+)\s*(?:month|mo)/i);
      if (yearMatch) totalMonths += parseInt(yearMatch[1]) * 12;
      if (monthMatch) totalMonths += parseInt(monthMatch[1]);
      continue;
    }

    const start = new Date(startStr);
    if (isNaN(start.getTime())) continue;

    let end = now;
    if (endStr && !isCurrent) {
      const parsedEnd = new Date(endStr);
      if (!isNaN(parsedEnd.getTime())) end = parsedEnd;
    }

    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (months > 0) totalMonths += months;
  }

  return Math.round(totalMonths / 12 * 10) / 10; // round to 1 decimal
}

// ==================== ENGAGEMENT ====================
function computeEngagement(
  candidate: any, interactions: any[], applicationLogs: any[], communications: any[],
  intelligence: any
): AssessmentDimension {
  const sources: string[] = [];
  let totalScore = 0;
  let weights = 0;
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

  // 1. Direct interactions (20% — was 25%, reduced to make room for meetings)
  const recentInteractions = interactions.filter(
    (i) => new Date(i.created_at).getTime() > ninetyDaysAgo
  );
  if (interactions.length > 0) {
    const score = Math.min(100, recentInteractions.length * 12);
    totalScore += score * 0.20;
    weights += 0.20;
    sources.push("candidate_interactions");
  }

  // 2. Communications / response time (25% — was 30%)
  if (communications && communications.length > 0) {
    const inbound = communications.filter((c: any) => c.direction === 'inbound');
    const outbound = communications.filter((c: any) => c.direction === 'outbound');

    // Calculate average response time
    let totalResponseMs = 0;
    let responseCount = 0;
    for (let i = 1; i < communications.length; i++) {
      const prev = communications[i - 1];
      const curr = communications[i];
      if (prev.direction === 'outbound' && curr.direction === 'inbound') {
        const responseTime = new Date(curr.original_timestamp).getTime() - new Date(prev.original_timestamp).getTime();
        if (responseTime > 0 && responseTime < 7 * 24 * 60 * 60 * 1000) { // within a week
          totalResponseMs += responseTime;
          responseCount++;
        }
      }
    }

    let responseScore = 50; // default
    if (responseCount > 0) {
      const avgResponseHours = (totalResponseMs / responseCount) / (1000 * 60 * 60);
      if (avgResponseHours < 1) responseScore = 100;
      else if (avgResponseHours < 4) responseScore = 85;
      else if (avgResponseHours < 12) responseScore = 70;
      else if (avgResponseHours < 24) responseScore = 55;
      else if (avgResponseHours < 48) responseScore = 35;
      else responseScore = 15;
    }

    // Volume score
    const volumeScore = Math.min(100, (inbound.length + outbound.length) * 8);
    const commScore = responseScore * 0.6 + volumeScore * 0.4;

    totalScore += commScore * 0.25;
    weights += 0.25;
    sources.push("communications");
  }

  // 3. Application logs (15% — was 20%)
  const recentLogs = applicationLogs.filter(
    (l) => new Date(l.created_at).getTime() > ninetyDaysAgo
  );
  if (applicationLogs.length > 0) {
    const logScore = Math.min(100, recentLogs.length * 10);
    totalScore += logScore * 0.15;
    weights += 0.15;
    sources.push("application_logs");
  }

  // 4. Profile completeness (10%)
  const completeness = candidate.profile_completeness || 0;
  if (completeness > 0) {
    totalScore += completeness * 0.10;
    weights += 0.10;
    sources.push("profile_completeness");
  }

  // 5. Login recency (10% — was 15%)
  const lastActivity = candidate.last_activity_at || candidate.updated_at;
  if (lastActivity) {
    const daysSince = (now - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
    let recencyScore = 0;
    if (daysSince < 2) recencyScore = 100;
    else if (daysSince < 7) recencyScore = 80;
    else if (daysSince < 14) recencyScore = 60;
    else if (daysSince < 30) recencyScore = 40;
    else recencyScore = 15;
    totalScore += recencyScore * 0.10;
    weights += 0.10;
    sources.push("last_activity");
  }

  // 6. NEW: Meeting attendance (20%)
  const attendedMeetings = intelligence.meetingParticipants || [];
  if (attendedMeetings.length > 0) {
    let meetingScore = 0;
    const count = attendedMeetings.length;
    if (count >= 4) meetingScore = 100;
    else if (count === 3) meetingScore = 80;
    else if (count === 2) meetingScore = 65;
    else meetingScore = 40;

    totalScore += meetingScore * 0.20;
    weights += 0.20;
    sources.push("meeting_attendance");
  }

  if (weights === 0) {
    return { score: 0, confidence: 0, sources: [], details: "No engagement data available" };
  }

  const finalScore = Math.round(totalScore / weights);
  const details = [
    interactions.length > 0 ? `${recentInteractions.length} interactions` : null,
    communications && communications.length > 0 ? `${communications.length} comms` : null,
    recentLogs.length > 0 ? `${recentLogs.length} app logs` : null,
    attendedMeetings.length > 0 ? `${attendedMeetings.length} meetings attended` : null,
  ].filter(Boolean).join(', ') + ' (90d)';

  return {
    score: finalScore,
    confidence: Math.min(1, weights / 0.6),
    sources,
    details,
  };
}

// ==================== CULTURE FIT ====================
function computeCultureFit(candidate: any, feedback: any[], intelligence: any): AssessmentDimension {
  const sources: string[] = [];
  let totalScore = 0;
  let weights = 0;

  // 1. NEW PRIMARY: interview_intelligence.culture_fit_score (0-100, highest quality AI signal)
  const iiCultureScores = (intelligence.interviewIntelligence || [])
    .filter((ii: any) => ii.culture_fit_score != null && ii.culture_fit_score > 0)
    .map((ii: any) => ii.culture_fit_score);

  if (iiCultureScores.length > 0) {
    const avg = iiCultureScores.reduce((a: number, b: number) => a + b, 0) / iiCultureScores.length;
    totalScore += avg * 0.35;
    weights += 0.35;
    sources.push("interview_intelligence");
  }

  // 2. NEW: candidate_interview_performance.cultural_fit_score (0-100)
  const ipCultureScores = (intelligence.interviewPerformance || [])
    .filter((ip: any) => ip.cultural_fit_score != null && ip.cultural_fit_score > 0)
    .map((ip: any) => ip.cultural_fit_score);

  if (ipCultureScores.length > 0) {
    const avg = ipCultureScores.reduce((a: number, b: number) => a + b, 0) / ipCultureScores.length;
    totalScore += avg * 0.25;
    weights += 0.25;
    sources.push("interview_performance");
  }

  // 3. Interview feedback culture scores (existing — scale 1-10 to 0-100)
  const cultureFitScores = feedback
    .filter((f) => f.culture_fit_score != null && f.culture_fit_score > 0)
    .map((f) => f.culture_fit_score);

  if (cultureFitScores.length > 0) {
    const avg = cultureFitScores.reduce((a: number, b: number) => a + b, 0) / cultureFitScores.length;
    totalScore += (avg * 10) * 0.20; // scale 1-10 to 0-100
    weights += 0.20;
    sources.push("interview_feedback");
  }

  // 4. NEW: values_poker_sessions culture_fit_scores
  const vpSessions = intelligence.valuesPokerSessions || [];
  if (vpSessions.length > 0) {
    const vpScores: number[] = [];
    for (const vp of vpSessions) {
      if (vp.culture_fit_scores) {
        const scores = typeof vp.culture_fit_scores === 'object' ? vp.culture_fit_scores : {};
        const vals = Object.values(scores).filter((v: any) => typeof v === 'number' && v > 0) as number[];
        if (vals.length > 0) {
          vpScores.push(vals.reduce((a, b) => a + b, 0) / vals.length);
        }
      }
      if (vp.consistency_score != null && vp.consistency_score > 0) {
        vpScores.push(vp.consistency_score);
      }
    }
    if (vpScores.length > 0) {
      const avg = vpScores.reduce((a, b) => a + b, 0) / vpScores.length;
      totalScore += avg * 0.10;
      weights += 0.10;
      sources.push("values_poker");
    }
  }

  // 5. AI personality insights + candidate_brief (existing fallbacks)
  if (candidate.personality_insights) {
    const insights = typeof candidate.personality_insights === 'string'
      ? candidate.personality_insights
      : JSON.stringify(candidate.personality_insights);
    if (insights.length > 20) {
      totalScore += 55 * 0.05;
      weights += 0.05;
      sources.push("personality_insights");
    }
  }

  if (candidate.candidate_brief) {
    const brief = typeof candidate.candidate_brief === 'string'
      ? candidate.candidate_brief
      : JSON.stringify(candidate.candidate_brief);
    if (brief.length > 50) {
      const positiveSignals = ['team player', 'collaborative', 'culture', 'values', 'adaptable', 'empathetic'].filter(
        (s) => brief.toLowerCase().includes(s)
      ).length;
      const negativeSignals = ['rigid', 'difficult', 'conflict', 'resistant'].filter(
        (s) => brief.toLowerCase().includes(s)
      ).length;
      const briefScore = Math.min(100, Math.max(20, 50 + positiveSignals * 10 - negativeSignals * 15));
      totalScore += briefScore * 0.05;
      weights += 0.05;
      sources.push("candidate_brief");
    }
  }

  if (weights === 0) {
    return {
      score: 0,
      confidence: 0,
      sources: [],
      details: "No culture fit data. Schedule interviews or generate personality insights.",
    };
  }

  const score = Math.round(totalScore / weights);
  // Confidence based on best available source
  let confidence = Math.min(0.4, weights);
  if (iiCultureScores.length > 0) confidence = Math.min(1, 0.5 + iiCultureScores.length * 0.15);
  else if (ipCultureScores.length > 0) confidence = Math.min(1, 0.4 + ipCultureScores.length * 0.15);
  else if (cultureFitScores.length > 0) confidence = Math.min(1, 0.3 + cultureFitScores.length * 0.2);

  const detailParts: string[] = [];
  if (iiCultureScores.length > 0) detailParts.push(`${iiCultureScores.length} AI interview analysis`);
  if (ipCultureScores.length > 0) detailParts.push(`${ipCultureScores.length} performance review(s)`);
  if (cultureFitScores.length > 0) {
    const avg = cultureFitScores.reduce((a: number, b: number) => a + b, 0) / cultureFitScores.length;
    detailParts.push(`${cultureFitScores.length} feedback avg ${avg.toFixed(1)}/10`);
  }
  if (vpSessions.length > 0) detailParts.push("values poker");
  if (sources.includes("personality_insights")) detailParts.push("AI personality");
  if (sources.includes("candidate_brief")) detailParts.push("brief");

  return {
    score: Math.min(100, score),
    confidence,
    sources,
    details: detailParts.join(' + ') || 'Pre-interview AI estimate',
  };
}

// ==================== SALARY MATCH ====================
function computeSalaryMatch(candidate: any, job: any | null): AssessmentDimension {
  let candidateMin = candidate.desired_salary_min;
  let candidateMax = candidate.desired_salary_max;
  let salaryConfidence = 0.85;
  const sources: string[] = [];

  // FALLBACK 1: Use current salary + 15% as inferred desired range
  if (!candidateMin && !candidateMax) {
    const currentMin = candidate.current_salary_min;
    const currentMax = candidate.current_salary_max;
    if (currentMin || currentMax) {
      candidateMin = Math.round((currentMin || currentMax) * 1.15);
      candidateMax = Math.round((currentMax || currentMin) * 1.25);
      salaryConfidence = 0.45;
      sources.push("current_salary_inferred");
    }
  }

  // FALLBACK 2: Seniority-based median
  if (!candidateMin && !candidateMax) {
    const seniority = inferSeniority(candidate);
    if (seniority && SENIORITY_SALARY_MEDIANS[seniority]) {
      const median = SENIORITY_SALARY_MEDIANS[seniority];
      candidateMin = median.min;
      candidateMax = median.max;
      salaryConfidence = 0.3;
      sources.push("seniority_median_inferred");
    }
  }

  if (!candidateMin && !candidateMax) {
    return { score: 0, confidence: 0, sources: [], details: "No salary expectation data" };
  }

  if (!sources.includes("current_salary_inferred") && !sources.includes("seniority_median_inferred")) {
    sources.push("candidate_salary");
  }

  if (!job || (!job.salary_min && !job.salary_max)) {
    return {
      score: 50,
      confidence: 0.1,
      sources,
      details: "No job salary data to compare",
    };
  }

  sources.push("job_salary");

  // Normalize salary to annual
  const jobPeriod = (job.salary_period || 'annual').toLowerCase();
  const multiplier = SALARY_MULTIPLIERS[jobPeriod] || 1;
  const jobMin = (job.salary_min || 0) * multiplier;
  const jobMax = (job.salary_max || jobMin * 1.5) * multiplier;

  const cMin = candidateMin || candidateMax;
  const cMax = candidateMax || candidateMin;

  // Calculate overlap
  const overlapStart = Math.max(jobMin, cMin);
  const overlapEnd = Math.min(jobMax, cMax);

  if (overlapStart <= overlapEnd) {
    const overlapSize = overlapEnd - overlapStart;
    const candidateRange = cMax - cMin || 1;
    const jobRange = jobMax - jobMin || 1;
    const overlapRatio = overlapSize / Math.min(candidateRange, jobRange);
    const score = Math.round(Math.min(100, 60 + overlapRatio * 40));

    let details = `Overlap: €${Math.round(overlapStart / 1000)}K-€${Math.round(overlapEnd / 1000)}K`;
    if (jobPeriod !== 'annual') details += ` (job: ${jobPeriod}, normalized)`;
    if (sources.includes("current_salary_inferred")) details += ' (inferred from current)';
    if (sources.includes("seniority_median_inferred")) details += ' (inferred from seniority)';

    if (candidate.current_salary_min) {
      const currentAvg = (candidate.current_salary_min + (candidate.current_salary_max || candidate.current_salary_min)) / 2;
      const desiredAvg = (cMin + cMax) / 2;
      const jumpPct = Math.round(((desiredAvg - currentAvg) / currentAvg) * 100);
      if (jumpPct > 20) details += `. ${jumpPct}% salary jump desired`;
    }

    return { score, confidence: salaryConfidence, sources, details };
  }

  // No overlap
  const gap = overlapStart - overlapEnd;
  const midJob = (jobMin + jobMax) / 2 || 1;
  const gapPercent = (gap / midJob) * 100;
  const score = Math.max(0, Math.round(60 - gapPercent * 1.5));

  let details = `Gap: €${Math.round(gap / 1000)}K apart (${Math.round(gapPercent)}%)`;
  if (sources.includes("current_salary_inferred")) details += ' (inferred from current)';
  if (sources.includes("seniority_median_inferred")) details += ' (inferred from seniority)';

  return { score, confidence: salaryConfidence, sources, details };
}

// Helper: infer seniority from candidate data
function inferSeniority(candidate: any): string | null {
  const title = (candidate.current_title || '').toLowerCase();
  const yoe = candidate.years_of_experience;

  // Try title-based inference
  const titleMap: [string, string][] = [
    ['intern', 'intern'], ['trainee', 'intern'], ['junior', 'junior'], ['jr.', 'junior'],
    ['associate', 'mid'], ['mid', 'mid'], ['senior', 'senior'], ['sr.', 'senior'],
    ['lead', 'lead'], ['principal', 'principal'], ['staff', 'staff'],
    ['head', 'head'], ['director', 'director'], ['vp', 'vp'],
    ['chief', 'c-level'], ['cto', 'c-level'], ['ceo', 'c-level'], ['cfo', 'c-level'],
  ];

  for (const [keyword, level] of titleMap) {
    if (title.includes(keyword)) return level;
  }

  // Fall back to years of experience
  if (yoe != null) {
    if (yoe < 2) return 'junior';
    if (yoe < 5) return 'mid';
    if (yoe < 8) return 'mid-senior';
    if (yoe < 12) return 'senior';
    return 'lead';
  }

  return 'mid'; // safe default
}

// ==================== LOCATION MATCH ====================
function computeLocationMatch(
  candidate: any, job: any | null, jobLocations: any[]
): AssessmentDimension {
  const desiredLocations = candidate.desired_locations;
  const remotePref = (candidate.remote_preference || '').toLowerCase();
  const sources = ["location_match"];

  // FALLBACK: use current location when preferences are empty
  let useCurrentLocation = false;
  let locationConfidence = 0.85;
  let effectiveLocations: string[] = [];

  if (desiredLocations && Array.isArray(desiredLocations) && desiredLocations.length > 0) {
    effectiveLocations = desiredLocations;
  } else if (candidate.location) {
    // Parse current location as fallback
    const loc = typeof candidate.location === 'string' ? candidate.location : '';
    if (loc) {
      effectiveLocations = [loc];
      useCurrentLocation = true;
      locationConfidence = 0.4;
      sources.push("current_location_inferred");
    }
  }

  const hasRemotePref = !!remotePref;
  const hasLocations = effectiveLocations.length > 0;

  if (!hasRemotePref && !hasLocations) {
    // Last resort: check work_authorization for country compatibility
    if (candidate.work_authorization && job) {
      const wa = typeof candidate.work_authorization === 'string'
        ? candidate.work_authorization.toLowerCase()
        : JSON.stringify(candidate.work_authorization || '').toLowerCase();
      const jobCountry = (job.location_country_code || job.location || '').toLowerCase();

      if (wa.includes('eu') || wa.includes('europe')) {
        const euCountries = ['nl', 'de', 'fr', 'be', 'netherlands', 'germany', 'france', 'belgium', 'spain', 'italy', 'portugal', 'ireland', 'austria', 'luxembourg'];
        if (euCountries.some(c => jobCountry.includes(c))) {
          return {
            score: 55,
            confidence: 0.25,
            sources: ["work_authorization_inferred"],
            details: "EU work authorization matches job country (no location preference set)",
          };
        }
      }

      return { score: 30, confidence: 0.15, sources: ["work_authorization_inferred"], details: "Work authorization exists but location preference unknown" };
    }

    return { score: 0, confidence: 0, sources: [], details: "No location preference data" };
  }

  if (!job) {
    return { score: 50, confidence: 0.1, sources, details: "No job to compare" };
  }

  // Determine job's remote status
  let jobRemoteType: 'remote' | 'hybrid' | 'onsite' = 'onsite';
  if (job.is_remote === true) {
    jobRemoteType = 'remote';
  } else {
    const loc = (job.location || '').toLowerCase();
    const emp = (job.employment_type || '').toLowerCase();
    if (loc.includes('remote') || emp.includes('remote')) jobRemoteType = 'remote';
    else if (loc.includes('hybrid') || emp.includes('hybrid')) jobRemoteType = 'hybrid';
  }

  // Determine candidate's preference
  let candPref: 'remote' | 'hybrid' | 'onsite' = 'hybrid';
  if (remotePref.includes('remote') || remotePref === 'fully_remote') candPref = 'remote';
  else if (remotePref.includes('onsite') || remotePref === 'office') candPref = 'onsite';
  else if (remotePref.includes('hybrid')) candPref = 'hybrid';

  const remoteScore = LOCATION_MATRIX[candPref]?.[jobRemoteType] ?? 50;

  // Location proximity check
  let locationScore = 0;
  let locationMatched = false;

  if (hasLocations) {
    const normalizedDesired = effectiveLocations.map((l: string) => l.toLowerCase().trim());

    if (jobLocations.length > 0) {
      sources.push("job_locations");
      for (const jl of jobLocations) {
        const jlCity = (jl.city || '').toLowerCase();
        const jlCountry = (jl.country || '').toLowerCase();
        if (normalizedDesired.some((d: string) => jlCity.includes(d) || d.includes(jlCity))) {
          locationScore = 100;
          locationMatched = true;
          break;
        }
        if (normalizedDesired.some((d: string) => jlCountry.includes(d) || d.includes(jlCountry))) {
          locationScore = Math.max(locationScore, 70);
          locationMatched = true;
        }
      }
    }

    if (!locationMatched) {
      const jobLoc = (job.location || '').toLowerCase();
      const jobCity = (job.location_city || '').toLowerCase();
      const jobCountry = (job.location_country_code || '').toLowerCase();

      if (normalizedDesired.some((d: string) => jobLoc.includes(d) || d.includes(jobLoc) ||
        (jobCity && (jobCity.includes(d) || d.includes(jobCity))))) {
        locationScore = 90;
        locationMatched = true;
      } else if (normalizedDesired.some((d: string) =>
        (jobCountry && (jobCountry.includes(d) || d.includes(jobCountry))))) {
        locationScore = 65;
        locationMatched = true;
      }
    }
  }

  // Combine remote compatibility and location proximity
  let finalScore: number;
  let details: string;

  if (jobRemoteType === 'remote') {
    finalScore = remoteScore;
    details = `Job: remote, Candidate: ${candPref}`;
  } else if (locationMatched) {
    finalScore = Math.round(remoteScore * 0.4 + locationScore * 0.6);
    details = `${candPref} ↔ ${jobRemoteType}, location match: ${locationScore}%`;
  } else {
    finalScore = Math.round(remoteScore * 0.7 + 15);
    details = `${candPref} ↔ ${jobRemoteType}, no location match`;
  }

  if (useCurrentLocation) details += ' (using current location)';

  return {
    score: Math.min(100, finalScore),
    confidence: locationMatched ? locationConfidence : Math.min(locationConfidence, 0.5),
    sources,
    details,
  };
}
