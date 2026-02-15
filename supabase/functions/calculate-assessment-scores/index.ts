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

    // Fetch all supporting data in parallel (including profile_experience as fallback)
    const [
      { data: profileSkills },
      { data: interactions },
      { data: applicationLogs },
      { data: taxonomy },
      { data: applications },
      { data: communications },
      { data: profileExperience },
    ] = await Promise.all([
      supabase.from("profile_skills").select("*").eq("user_id", candidate_id),
      supabase.from("candidate_interactions").select("*").eq("candidate_id", candidate_id),
      supabase.from("candidate_application_logs").select("*").eq("candidate_profile_id", candidate_id),
      supabase.from("skills_taxonomy").select("canonical_name, synonyms, display_name"),
      supabase.from("applications").select("id").eq("candidate_id", candidate_id),
      supabase.from("unified_communications").select("original_timestamp, direction, channel")
        .eq("entity_id", candidate_id).order("original_timestamp", { ascending: true }).limit(100),
      supabase.from("profile_experience").select("*").eq("user_id", candidate_id).order("start_date", { ascending: false }),
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

    // ===== COMPUTE EACH DIMENSION =====
    const skillsMatch = computeSkillsMatch(candidate, profileSkills || [], job, taxonomy || []);
    const experience = computeExperience(candidate, job, profileExperience || []);
    const engagement = computeEngagement(candidate, interactions || [], applicationLogs || [], communications || []);
    const cultureFit = computeCultureFit(candidate, allFeedback);
    const salaryMatch = computeSalaryMatch(candidate, job);
    const locationMatch = computeLocationMatch(candidate, job, jobLocations);

    // Calculate overall (only count dimensions with confidence > 0.1)
    const dimensions = [skillsMatch, experience, engagement, cultureFit, salaryMatch, locationMatch];
    const scored = dimensions.filter((d) => d.confidence > 0.1);
    const overallScore = scored.length > 0
      ? Math.round(scored.reduce((sum, d) => sum + d.score, 0) / scored.length)
      : 0;
    const overallConfidence = scored.length > 0
      ? Math.round((scored.reduce((sum, d) => sum + d.confidence, 0) / dimensions.length) * 100) / 100
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
  candidate: any, profileSkills: any[], job: any | null, taxonomy: any[]
): AssessmentDimension {
  // Gather candidate skills from all sources
  const candidateSkillNames = new Set<string>();

  profileSkills.forEach((s) => {
    if (s.skill_name) candidateSkillNames.add(s.skill_name.toLowerCase().trim());
  });

  if (candidate.skills) {
    const arr = Array.isArray(candidate.skills) ? candidate.skills : [];
    arr.forEach((s: any) => {
      const name = typeof s === "string" ? s : s?.name || s?.skill;
      if (name) candidateSkillNames.add(name.toLowerCase().trim());
    });
  }

  // Also extract keywords from work_history titles as fallback
  if (candidateSkillNames.size === 0 && candidate.work_history) {
    const wh = Array.isArray(candidate.work_history) ? candidate.work_history : [];
    wh.forEach((w: any) => {
      const title = (w.title || w.job_title || '').toLowerCase();
      // Extract obvious skill keywords from titles
      const keywords = title.split(/[\s,/\-&]+/).filter((k: string) => k.length > 2);
      keywords.forEach((k: string) => candidateSkillNames.add(k));
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
  const normalizedCandidate = new Set<string>();
  candidateSkillNames.forEach((skill) => {
    normalizedCandidate.add(synonymMap.get(skill) || skill);
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

  // Match
  const matchedMust = normMustHave.filter((r) => normalizedCandidate.has(r)).length;
  const matchedNice = normNiceToHave.filter((r) => normalizedCandidate.has(r)).length;

  const mustWeight = 0.7;
  const niceWeight = 0.3;
  const mustScore = normMustHave.length > 0 ? (matchedMust / normMustHave.length) : 1;
  const niceScore = normNiceToHave.length > 0 ? (matchedNice / normNiceToHave.length) : 0.5;
  const score = Math.round((mustScore * mustWeight + niceScore * niceWeight) * 100);

  const missingMust = normMustHave.length - matchedMust;

  return {
    score,
    confidence: 0.85,
    sources: ["profile_skills", "skills_taxonomy", "job_requirements"],
    details: `${matchedMust}/${normMustHave.length} must-have, ${matchedNice}/${normNiceToHave.length} nice-to-have${missingMust > 0 ? `. Missing ${missingMust} critical skills` : ''}`,
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
  candidate: any, interactions: any[], applicationLogs: any[], communications: any[]
): AssessmentDimension {
  const sources: string[] = [];
  let totalScore = 0;
  let weights = 0;
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

  // 1. Direct interactions (30%)
  const recentInteractions = interactions.filter(
    (i) => new Date(i.created_at).getTime() > ninetyDaysAgo
  );
  if (interactions.length > 0) {
    const score = Math.min(100, recentInteractions.length * 12);
    totalScore += score * 0.25;
    weights += 0.25;
    sources.push("candidate_interactions");
  }

  // 2. Communications / response time (30%)
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

    totalScore += commScore * 0.30;
    weights += 0.30;
    sources.push("communications");
  }

  // 3. Application logs (20%)
  const recentLogs = applicationLogs.filter(
    (l) => new Date(l.created_at).getTime() > ninetyDaysAgo
  );
  if (applicationLogs.length > 0) {
    const logScore = Math.min(100, recentLogs.length * 10);
    totalScore += logScore * 0.20;
    weights += 0.20;
    sources.push("application_logs");
  }

  // 4. Profile completeness (10%)
  const completeness = candidate.profile_completeness || 0;
  if (completeness > 0) {
    totalScore += completeness * 0.10;
    weights += 0.10;
    sources.push("profile_completeness");
  }

  // 5. Login recency (15%)
  const lastActivity = candidate.last_activity_at || candidate.updated_at;
  if (lastActivity) {
    const daysSince = (now - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
    let recencyScore = 0;
    if (daysSince < 2) recencyScore = 100;
    else if (daysSince < 7) recencyScore = 80;
    else if (daysSince < 14) recencyScore = 60;
    else if (daysSince < 30) recencyScore = 40;
    else recencyScore = 15;
    totalScore += recencyScore * 0.15;
    weights += 0.15;
    sources.push("last_activity");
  }

  if (weights === 0) {
    return { score: 0, confidence: 0, sources: [], details: "No engagement data available" };
  }

  const finalScore = Math.round(totalScore / weights);
  const details = [
    interactions.length > 0 ? `${recentInteractions.length} interactions` : null,
    communications && communications.length > 0 ? `${communications.length} comms` : null,
    recentLogs.length > 0 ? `${recentLogs.length} app logs` : null,
  ].filter(Boolean).join(', ') + ' (90d)';

  return {
    score: finalScore,
    confidence: Math.min(1, weights / 0.6),
    sources,
    details,
  };
}

// ==================== CULTURE FIT ====================
function computeCultureFit(candidate: any, feedback: any[]): AssessmentDimension {
  const sources: string[] = [];
  let totalScore = 0;
  let weights = 0;

  // 1. Interview feedback culture scores (primary, high confidence)
  const cultureFitScores = feedback
    .filter((f) => f.culture_fit_score != null && f.culture_fit_score > 0)
    .map((f) => f.culture_fit_score);

  if (cultureFitScores.length > 0) {
    const avg = cultureFitScores.reduce((a: number, b: number) => a + b, 0) / cultureFitScores.length;
    totalScore += (avg * 10) * 0.6; // scale 1-10 to 0-100
    weights += 0.6;
    sources.push("interview_feedback");
  }

  // 2. AI personality insights baseline (lower confidence)
  if (candidate.personality_insights) {
    const insights = typeof candidate.personality_insights === 'string'
      ? candidate.personality_insights
      : JSON.stringify(candidate.personality_insights);
    // Simple heuristic: if personality insights exist, give a baseline moderate score
    if (insights.length > 20) {
      totalScore += 55 * 0.2; // moderate baseline
      weights += 0.2;
      sources.push("personality_insights");
    }
  }

  // 3. Candidate brief / AI assessment
  if (candidate.candidate_brief) {
    const brief = typeof candidate.candidate_brief === 'string'
      ? candidate.candidate_brief
      : JSON.stringify(candidate.candidate_brief);
    if (brief.length > 50) {
      // Check for positive/negative culture signals
      const positiveSignals = ['team player', 'collaborative', 'culture', 'values', 'adaptable', 'empathetic'].filter(
        (s) => brief.toLowerCase().includes(s)
      ).length;
      const negativeSignals = ['rigid', 'difficult', 'conflict', 'resistant'].filter(
        (s) => brief.toLowerCase().includes(s)
      ).length;
      const briefScore = Math.min(100, Math.max(20, 50 + positiveSignals * 10 - negativeSignals * 15));
      totalScore += briefScore * 0.2;
      weights += 0.2;
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
  const confidence = cultureFitScores.length > 0
    ? Math.min(1, 0.3 + cultureFitScores.length * 0.2)
    : Math.min(0.4, weights);

  const detailParts: string[] = [];
  if (cultureFitScores.length > 0) {
    const avg = cultureFitScores.reduce((a: number, b: number) => a + b, 0) / cultureFitScores.length;
    detailParts.push(`${cultureFitScores.length} interview(s) avg ${avg.toFixed(1)}/10`);
  }
  if (sources.includes("personality_insights")) detailParts.push("AI personality baseline");
  if (sources.includes("candidate_brief")) detailParts.push("brief analysis");

  return {
    score: Math.min(100, score),
    confidence,
    sources,
    details: detailParts.join(' + ') || 'Pre-interview AI estimate',
  };
}

// ==================== SALARY MATCH ====================
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

  // Normalize salary to annual using salary_period
  const jobPeriod = (job.salary_period || 'annual').toLowerCase();
  const multiplier = SALARY_MULTIPLIERS[jobPeriod] || 1;
  const jobMin = (job.salary_min || 0) * multiplier;
  const jobMax = (job.salary_max || jobMin * 1.5) * multiplier;

  // Candidate salaries are assumed annual (from profile preferences)
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

    // Current vs desired intelligence
    if (candidate.current_salary_min) {
      const currentAvg = (candidate.current_salary_min + (candidate.current_salary_max || candidate.current_salary_min)) / 2;
      const desiredAvg = (cMin + cMax) / 2;
      const jumpPct = Math.round(((desiredAvg - currentAvg) / currentAvg) * 100);
      if (jumpPct > 20) details += `. ${jumpPct}% salary jump desired`;
    }

    return {
      score,
      confidence: 0.85,
      sources: ["candidate_salary", "job_salary"],
      details,
    };
  }

  // No overlap
  const gap = overlapStart - overlapEnd;
  const midJob = (jobMin + jobMax) / 2 || 1;
  const gapPercent = (gap / midJob) * 100;
  const score = Math.max(0, Math.round(60 - gapPercent * 1.5));

  return {
    score,
    confidence: 0.8,
    sources: ["candidate_salary", "job_salary"],
    details: `Gap: €${Math.round(gap / 1000)}K apart (${Math.round(gapPercent)}%)`,
  };
}

// ==================== LOCATION MATCH ====================
function computeLocationMatch(
  candidate: any, job: any | null, jobLocations: any[]
): AssessmentDimension {
  // Use desired_locations (correct column name)
  const desiredLocations = candidate.desired_locations;
  const remotePref = (candidate.remote_preference || '').toLowerCase();

  if (!remotePref && (!desiredLocations || (Array.isArray(desiredLocations) && desiredLocations.length === 0))) {
    return { score: 0, confidence: 0, sources: [], details: "No location preference data" };
  }

  if (!job) {
    return { score: 50, confidence: 0.1, sources: ["candidate_profile"], details: "No job to compare" };
  }

  const sources = ["location_match"];

  // Determine job's remote status from is_remote boolean first, then text
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
  let candPref: 'remote' | 'hybrid' | 'onsite' = 'hybrid'; // default
  if (remotePref.includes('remote') || remotePref === 'fully_remote') candPref = 'remote';
  else if (remotePref.includes('onsite') || remotePref === 'office') candPref = 'onsite';
  else if (remotePref.includes('hybrid')) candPref = 'hybrid';

  // Use the matrix for remote/hybrid/onsite scoring
  const remoteScore = LOCATION_MATRIX[candPref]?.[jobRemoteType] ?? 50;

  // Location proximity check
  let locationScore = 0;
  let locationMatched = false;

  if (desiredLocations && Array.isArray(desiredLocations)) {
    const normalizedDesired = desiredLocations.map((l: string) => l.toLowerCase().trim());

    // Check against job_locations table (structured)
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

    // Fallback: check job.location text, job.location_city, job.location_country_code
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
    // For remote jobs, location doesn't matter much
    finalScore = remoteScore;
    details = `Job: remote, Candidate: ${candPref}`;
  } else if (locationMatched) {
    // Weighted: 40% remote-type match + 60% location match
    finalScore = Math.round(remoteScore * 0.4 + locationScore * 0.6);
    details = `${candPref} ↔ ${jobRemoteType}, location match: ${locationScore}%`;
  } else {
    // No location match, rely on remote type
    finalScore = Math.round(remoteScore * 0.7 + 15); // small baseline
    details = `${candPref} ↔ ${jobRemoteType}, no location match`;
  }

  return {
    score: Math.min(100, finalScore),
    confidence: locationMatched ? 0.85 : 0.5,
    sources,
    details,
  };
}
