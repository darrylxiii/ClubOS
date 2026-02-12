import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Comprehensive Move Probability Calculator v2
 * 
 * 15 weighted factors across 5 categories:
 * 
 * CATEGORY 1 — EXPLICIT SIGNALS (weight: 35%)
 *   1. LinkedIn "Open to Work" status        (0.15)
 *   2. Self-declared availability status      (0.12)
 *   3. Notice period (short = more movable)   (0.08)
 *
 * CATEGORY 2 — BEHAVIORAL SIGNALS (weight: 25%)
 *   4. LinkedIn profile activity changes      (0.07)
 *   5. Response rate to recruiter outreach    (0.06)
 *   6. Engagement recency                    (0.06)
 *   7. GitHub activity spike (if technical)   (0.03)
 *   8. Public presence / thought leadership   (0.03)
 *
 * CATEGORY 3 — CAREER PATTERN SIGNALS (weight: 20%)
 *   9. Tenure at current company             (0.08)
 *  10. Career velocity / progression speed   (0.06)
 *  11. Job-hopping pattern (avg tenure)      (0.06)
 *
 * CATEGORY 4 — MARKET & CONTEXT SIGNALS (weight: 15%)
 *  12. Industry demand / market heat         (0.05)
 *  13. Compensation gap (current vs target)  (0.05)
 *  14. Seniority level mobility              (0.05)
 *
 * CATEGORY 5 — RELATIONSHIP SIGNALS (weight: 5%)
 *  15. Relationship strength with TQC        (0.05)
 */

interface Factor {
  value: number;     // 0-100
  weight: number;    // 0-1, all weights sum to 1.0
  reason: string;
  category: string;
  signal_strength: 'strong' | 'moderate' | 'weak' | 'none';
}

interface MoveProbabilityResult {
  candidate_id: string;
  move_probability: number;
  factors: Record<string, Factor>;
  recommendation: string;
  confidence: number;
  top_signals: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { candidate_id, batch_ids } = await req.json();
    const candidateIds = batch_ids || (candidate_id ? [candidate_id] : []);

    if (candidateIds.length === 0) {
      throw new Error('No candidate_id or batch_ids provided');
    }

    console.log(`[move-prob-v2] Processing ${candidateIds.length} candidates`);

    const results = [];
    for (const id of candidateIds) {
      try {
        const result = await calculateForCandidate(supabase, id);
        results.push(result);
      } catch (err) {
        console.error(`[move-prob-v2] Error for ${id}:`, err);
        results.push({ candidate_id: id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: candidateIds.length === 1 ? results[0] : results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[move-prob-v2] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function calculateForCandidate(supabase: any, candidateId: string): Promise<MoveProbabilityResult> {
  // Fetch ALL available candidate data in one query
  const { data: candidate, error: candidateError } = await supabase
    .from('candidate_profiles')
    .select(`
      id,
      full_name,
      actively_looking,
      availability_status,
      notice_period,
      tenure_current_months,
      career_velocity_score,
      years_of_experience,
      seniority_level,
      industries,
      skills,
      work_history,
      linkedin_profile_data,
      linkedin_url,
      enrichment_data,
      engagement_score,
      github_url,
      public_mentions,
      candidate_brief,
      current_salary_min,
      current_salary_max,
      desired_salary_min,
      desired_salary_max,
      ghost_mode_enabled,
      user_id
    `)
    .eq('id', candidateId)
    .single();

  // Fetch github data from profiles table if user_id exists
  let githubProfileData = null;
  if (!candidateError && candidate?.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('github_profile_data')
      .eq('id', candidate.user_id)
      .single();
    githubProfileData = profile?.github_profile_data;
  }

  if (candidateError || !candidate) {
    throw new Error(`Candidate not found: ${candidateId}`);
  }

  // Skip ghost mode candidates
  if (candidate.ghost_mode_enabled) {
    return {
      candidate_id: candidateId,
      move_probability: 0,
      factors: {},
      recommendation: 'Ghost mode active: enrichment paused.',
      confidence: 0,
      top_signals: [],
    };
  }

  // Fetch relationship data
  const { data: relationship } = await supabase
    .from('candidate_relationships')
    .select(`
      warmth_score,
      relationship_strength,
      response_rate,
      last_meaningful_contact,
      responses_received,
      total_touchpoints
    `)
    .eq('candidate_id', candidateId)
    .single();

  // Calculate all 15 factors
  const factors: Record<string, Factor> = {
    // === CATEGORY 1: EXPLICIT SIGNALS (35%) ===
    linkedin_open_to_work: calcLinkedInOpenToWork(candidate.linkedin_profile_data, candidate.actively_looking),
    availability_status: calcAvailabilityStatus(candidate.availability_status),
    notice_period: calcNoticePeriod(candidate.notice_period),

    // === CATEGORY 2: BEHAVIORAL SIGNALS (25%) ===
    linkedin_activity: calcLinkedInActivity(candidate.linkedin_profile_data, candidate.enrichment_data),
    response_rate: calcResponseRate(relationship),
    engagement_recency: calcEngagementRecency(relationship),
    github_activity: calcGithubActivity(githubProfileData),
    public_presence: calcPublicPresence(candidate.public_mentions),

    // === CATEGORY 3: CAREER PATTERN SIGNALS (20%) ===
    tenure_current: calcTenure(candidate.tenure_current_months),
    career_velocity: calcCareerVelocity(candidate.career_velocity_score),
    job_hopping_pattern: calcJobHoppingPattern(candidate.work_history),

    // === CATEGORY 4: MARKET & CONTEXT SIGNALS (15%) ===
    industry_demand: await calcIndustryDemand(supabase, candidate.industries),
    compensation_gap: calcCompensationGap(
      candidate.current_salary_min || candidate.current_salary_max,
      candidate.desired_salary_min || candidate.desired_salary_max
    ),
    seniority_mobility: calcSeniorityMobility(candidate.seniority_level, candidate.years_of_experience),

    // === CATEGORY 5: RELATIONSHIP SIGNALS (5%) ===
    relationship_strength: calcRelationshipStrength(relationship),
  };

  // Calculate weighted total
  let totalScore = 0;
  let totalWeight = 0;
  let dataPointsAvailable = 0;
  const totalFactors = Object.keys(factors).length;

  for (const factor of Object.values(factors)) {
    totalScore += factor.value * factor.weight;
    totalWeight += factor.weight;
    if (factor.signal_strength !== 'none') dataPointsAvailable++;
  }

  // Normalize if weights don't perfectly sum to 1
  const moveProbability = Math.round(Math.min(100, Math.max(0, totalScore / totalWeight)));

  // Calculate confidence based on data availability
  const confidence = Math.round((dataPointsAvailable / totalFactors) * 100);

  // Extract top signals (strongest positive or negative influences)
  const sortedFactors = Object.entries(factors)
    .filter(([, f]) => f.signal_strength !== 'none')
    .sort((a, b) => Math.abs(b[1].value * b[1].weight) - Math.abs(a[1].value * a[1].weight))
    .slice(0, 5);

  const topSignals = sortedFactors.map(([key, f]) => {
    const direction = f.value >= 60 ? '↑' : f.value <= 40 ? '↓' : '→';
    return `${direction} ${f.reason}`;
  });

  const recommendation = getRecommendation(moveProbability, confidence, factors);

  // Update candidate profile
  const { error: updateError } = await supabase
    .from('candidate_profiles')
    .update({
      move_probability: moveProbability,
      move_probability_factors: factors,
      move_probability_updated_at: new Date().toISOString(),
    })
    .eq('id', candidateId);

  if (updateError) {
    console.error('[move-prob-v2] Update error:', updateError);
    throw updateError;
  }

  // Trigger tier recalculation (best-effort)
  try {
    await supabase.rpc('update_candidate_tier', {
      p_candidate_id: candidateId,
      p_reason: 'move_probability_updated'
    });
  } catch { /* tier update is best-effort */ }

  console.log(`[move-prob-v2] ${candidate.full_name}: ${moveProbability}% (confidence: ${confidence}%)`);

  return {
    candidate_id: candidateId,
    move_probability: moveProbability,
    factors,
    recommendation,
    confidence,
    top_signals: topSignals,
  };
}


// ═══════════════════════════════════════════════════════════════
// CATEGORY 1: EXPLICIT SIGNALS (35% total weight)
// These are the strongest indicators — the candidate told us.
// ═══════════════════════════════════════════════════════════════

function calcLinkedInOpenToWork(linkedinData: any, activelyLooking: boolean | null): Factor {
  const weight = 0.15;

  // Check LinkedIn profile data for "Open to Work" signals
  const isOpenToWork = linkedinData?.is_open_to_work 
    || linkedinData?.open_to_work 
    || linkedinData?.openToWork
    || linkedinData?.basic_info?.is_open_to_work
    || linkedinData?.basic_info?.openToWork
    || false;

  // Also check the headline for "Open to Work" / "Looking for" signals
  const headline = (linkedinData?.headline || linkedinData?.basic_info?.headline || '').toLowerCase();
  const headlineSignals = [
    'open to work', 'seeking', 'looking for', 'available for', 
    'in transition', 'exploring', 'open to opportunities', 'freelance available'
  ];
  const headlineHasSignal = headlineSignals.some(s => headline.includes(s));

  // Combine LinkedIn signal with our own actively_looking flag
  if (isOpenToWork || activelyLooking === true) {
    return {
      value: 98,
      weight,
      reason: isOpenToWork ? 'LinkedIn "Open to Work" badge active' : 'Self-declared: actively looking',
      category: 'explicit',
      signal_strength: 'strong',
    };
  }

  if (headlineHasSignal) {
    return {
      value: 90,
      weight,
      reason: `LinkedIn headline signals job seeking: "${headline.substring(0, 60)}"`,
      category: 'explicit',
      signal_strength: 'strong',
    };
  }

  if (activelyLooking === false) {
    return {
      value: 15,
      weight,
      reason: 'Explicitly stated: not actively looking',
      category: 'explicit',
      signal_strength: 'strong',
    };
  }

  return {
    value: 45,
    weight,
    reason: 'No explicit Open to Work signal detected',
    category: 'explicit',
    signal_strength: 'none',
  };
}

function calcAvailabilityStatus(status: string | null): Factor {
  const weight = 0.12;

  const statusMap: Record<string, { value: number; reason: string; strength: Factor['signal_strength'] }> = {
    'actively_looking':  { value: 100, reason: 'Actively looking for opportunities', strength: 'strong' },
    'passively_open':    { value: 78, reason: 'Open to the right opportunity', strength: 'moderate' },
    'open_to_referrals': { value: 65, reason: 'Open to referrals only', strength: 'moderate' },
    'not_looking':       { value: 15, reason: 'Not currently looking', strength: 'strong' },
    'employed_happy':    { value: 8, reason: 'Happy in current role', strength: 'strong' },
    'on_notice':         { value: 95, reason: 'Currently serving notice period', strength: 'strong' },
    'unemployed':        { value: 92, reason: 'Currently between roles', strength: 'strong' },
  };

  const match = statusMap[status || ''];
  if (match) {
    return { value: match.value, weight, reason: match.reason, category: 'explicit', signal_strength: match.strength };
  }

  return { value: 50, weight, reason: 'Availability status unknown', category: 'explicit', signal_strength: 'none' };
}

function calcNoticePeriod(noticePeriod: string | null): Factor {
  const weight = 0.08;

  if (!noticePeriod) {
    return { value: 50, weight, reason: 'Notice period unknown', category: 'explicit', signal_strength: 'none' };
  }

  const np = noticePeriod.toLowerCase();

  // Parse notice period to approximate days
  let days = 30; // default
  if (np.includes('immediate') || np.includes('none') || np === '0') days = 0;
  else if (np.includes('1 week') || np.includes('7 day')) days = 7;
  else if (np.includes('2 week') || np.includes('14 day')) days = 14;
  else if (np.includes('1 month') || np.includes('30 day') || np.includes('4 week')) days = 30;
  else if (np.includes('2 month') || np.includes('60 day') || np.includes('8 week')) days = 60;
  else if (np.includes('3 month') || np.includes('90 day') || np.includes('12 week')) days = 90;
  else if (np.includes('6 month')) days = 180;

  if (days <= 14) {
    return { value: 90, weight, reason: `Short notice: ${noticePeriod} — can move quickly`, category: 'explicit', signal_strength: 'moderate' };
  } else if (days <= 30) {
    return { value: 75, weight, reason: `Standard notice: ${noticePeriod}`, category: 'explicit', signal_strength: 'moderate' };
  } else if (days <= 60) {
    return { value: 55, weight, reason: `Moderate notice: ${noticePeriod}`, category: 'explicit', signal_strength: 'moderate' };
  } else if (days <= 90) {
    return { value: 35, weight, reason: `Long notice: ${noticePeriod} — slower to move`, category: 'explicit', signal_strength: 'moderate' };
  } else {
    return { value: 20, weight, reason: `Very long notice: ${noticePeriod}`, category: 'explicit', signal_strength: 'weak' };
  }
}


// ═══════════════════════════════════════════════════════════════
// CATEGORY 2: BEHAVIORAL SIGNALS (25% total weight)
// What the candidate is *doing* that hints at readiness.
// ═══════════════════════════════════════════════════════════════

function calcLinkedInActivity(linkedinData: any, enrichmentData: any): Factor {
  const weight = 0.07;

  // Check for profile update recency
  const profileUpdatedAt = linkedinData?.profile_updated_at 
    || linkedinData?.basic_info?.profile_updated_at;

  // Check for activity change from enrichment
  const activityChange = enrichmentData?.linkedin_activity_change;

  // Check for recent headline/summary changes (strong signal)
  const headlineChanged = enrichmentData?.headline_changed_recently;
  const summaryChanged = enrichmentData?.summary_changed_recently;
  const photoChanged = enrichmentData?.photo_changed_recently;

  // Count profile change signals
  let changeCount = 0;
  if (headlineChanged) changeCount++;
  if (summaryChanged) changeCount++;
  if (photoChanged) changeCount++;

  if (changeCount >= 2) {
    return {
      value: 92,
      weight,
      reason: `Multiple LinkedIn profile updates detected (${changeCount} changes) — strong job-seeking pattern`,
      category: 'behavioral',
      signal_strength: 'strong',
    };
  }

  if (headlineChanged) {
    return {
      value: 85,
      weight,
      reason: 'LinkedIn headline recently updated — common pre-job-search behavior',
      category: 'behavioral',
      signal_strength: 'strong',
    };
  }

  if (activityChange && activityChange >= 30) {
    return {
      value: 80,
      weight,
      reason: `LinkedIn activity surged ${activityChange}% — increased networking`,
      category: 'behavioral',
      signal_strength: 'moderate',
    };
  }

  if (activityChange && activityChange >= 10) {
    return {
      value: 65,
      weight,
      reason: `LinkedIn activity up ${activityChange}%`,
      category: 'behavioral',
      signal_strength: 'moderate',
    };
  }

  if (profileUpdatedAt) {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(profileUpdatedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate <= 30) {
      return { value: 70, weight, reason: `LinkedIn profile updated ${daysSinceUpdate}d ago`, category: 'behavioral', signal_strength: 'moderate' };
    }
  }

  return { value: 45, weight, reason: 'No notable LinkedIn activity changes', category: 'behavioral', signal_strength: 'none' };
}

function calcResponseRate(relationship: any): Factor {
  const weight = 0.06;

  if (!relationship || relationship.response_rate == null) {
    return { value: 40, weight, reason: 'No outreach response data', category: 'behavioral', signal_strength: 'none' };
  }

  const rate = relationship.response_rate;
  if (rate >= 80) return { value: 92, weight, reason: `Excellent response rate: ${rate}%`, category: 'behavioral', signal_strength: 'strong' };
  if (rate >= 60) return { value: 78, weight, reason: `Good response rate: ${rate}%`, category: 'behavioral', signal_strength: 'moderate' };
  if (rate >= 40) return { value: 58, weight, reason: `Moderate response rate: ${rate}%`, category: 'behavioral', signal_strength: 'moderate' };
  if (rate >= 20) return { value: 38, weight, reason: `Low response rate: ${rate}%`, category: 'behavioral', signal_strength: 'weak' };
  return { value: 18, weight, reason: `Very low response rate: ${rate}%`, category: 'behavioral', signal_strength: 'weak' };
}

function calcEngagementRecency(relationship: any): Factor {
  const weight = 0.06;

  if (!relationship?.last_meaningful_contact) {
    return { value: 30, weight, reason: 'No recent engagement data', category: 'behavioral', signal_strength: 'none' };
  }

  const days = Math.floor((Date.now() - new Date(relationship.last_meaningful_contact).getTime()) / (1000 * 60 * 60 * 24));

  if (days <= 7)  return { value: 95, weight, reason: 'Engaged within last week', category: 'behavioral', signal_strength: 'strong' };
  if (days <= 14) return { value: 82, weight, reason: 'Engaged within last 2 weeks', category: 'behavioral', signal_strength: 'moderate' };
  if (days <= 30) return { value: 68, weight, reason: 'Engaged within last month', category: 'behavioral', signal_strength: 'moderate' };
  if (days <= 60) return { value: 48, weight, reason: 'Last engaged 1-2 months ago', category: 'behavioral', signal_strength: 'weak' };
  if (days <= 90) return { value: 32, weight, reason: 'Last engaged 2-3 months ago', category: 'behavioral', signal_strength: 'weak' };
  return { value: 18, weight, reason: 'Dormant: no engagement in 3+ months', category: 'behavioral', signal_strength: 'weak' };
}

function calcGithubActivity(githubData: any): Factor {
  const weight = 0.03;

  if (!githubData) {
    return { value: 50, weight, reason: 'No GitHub data (non-technical or not connected)', category: 'behavioral', signal_strength: 'none' };
  }

  // Check for contribution patterns that signal job seeking:
  // - Suddenly updating old repos (portfolio polish)
  // - Creating new public repos (showcasing skills)
  // - Increased activity after period of quiet
  const totalRepos = githubData.public_repos || githubData.repositories?.length || 0;
  const recentActivity = githubData.recent_contributions || githubData.contributions_last_30d || 0;

  if (recentActivity > 50) {
    return { value: 82, weight, reason: `High GitHub activity: ${recentActivity} contributions in 30d — portfolio polishing`, category: 'behavioral', signal_strength: 'moderate' };
  }
  if (recentActivity > 20) {
    return { value: 65, weight, reason: `Active on GitHub: ${recentActivity} recent contributions`, category: 'behavioral', signal_strength: 'weak' };
  }
  if (totalRepos > 10) {
    return { value: 55, weight, reason: `${totalRepos} public repos — established portfolio`, category: 'behavioral', signal_strength: 'weak' };
  }

  return { value: 45, weight, reason: 'Minimal GitHub activity', category: 'behavioral', signal_strength: 'weak' };
}

function calcPublicPresence(publicMentions: any): Factor {
  const weight = 0.03;

  if (!publicMentions) {
    return { value: 50, weight, reason: 'No public presence data', category: 'behavioral', signal_strength: 'none' };
  }

  const articles = publicMentions.articles?.length || 0;
  const talks = publicMentions.talks?.length || 0;
  const mentions = publicMentions.mentions?.length || 0;
  const total = articles + talks + mentions;

  // Candidates with high public presence have more options and may be more likely to be headhunted
  if (total >= 10) {
    return { value: 75, weight, reason: `Strong public presence: ${total} mentions/articles — high visibility in market`, category: 'behavioral', signal_strength: 'moderate' };
  }
  if (total >= 3) {
    return { value: 62, weight, reason: `Some public presence: ${total} mentions/articles`, category: 'behavioral', signal_strength: 'weak' };
  }

  return { value: 48, weight, reason: 'Limited public presence', category: 'behavioral', signal_strength: 'weak' };
}


// ═══════════════════════════════════════════════════════════════
// CATEGORY 3: CAREER PATTERN SIGNALS (20% total weight)
// Historical patterns that predict future behavior.
// ═══════════════════════════════════════════════════════════════

function calcTenure(tenureMonths: number | null): Factor {
  const weight = 0.08;

  if (tenureMonths == null) {
    return { value: 50, weight, reason: 'Current tenure unknown', category: 'career_pattern', signal_strength: 'none' };
  }

  // Research-backed tenure sweet spots for job change:
  // 18-24 months: "itchy feet" period starts
  // 24-48 months: peak move window
  // 48-60 months: very high — seeking new challenges
  // 60+: decreases — increasingly settled
  // <12 months: very low — just started

  if (tenureMonths < 6)  return { value: 10, weight, reason: `${tenureMonths}m tenure — just started, very unlikely to move`, category: 'career_pattern', signal_strength: 'strong' };
  if (tenureMonths < 12) return { value: 20, weight, reason: `${tenureMonths}m tenure — still settling in`, category: 'career_pattern', signal_strength: 'moderate' };
  if (tenureMonths < 18) return { value: 40, weight, reason: `${tenureMonths}m tenure — approaching move window`, category: 'career_pattern', signal_strength: 'moderate' };
  if (tenureMonths < 24) return { value: 60, weight, reason: `${tenureMonths}m tenure — entering sweet spot for a move`, category: 'career_pattern', signal_strength: 'moderate' };
  if (tenureMonths < 36) return { value: 80, weight, reason: `${tenureMonths}m tenure — peak move probability window (2-3y)`, category: 'career_pattern', signal_strength: 'strong' };
  if (tenureMonths < 48) return { value: 85, weight, reason: `${tenureMonths}m tenure — strong move window (3-4y)`, category: 'career_pattern', signal_strength: 'strong' };
  if (tenureMonths < 60) return { value: 88, weight, reason: `${tenureMonths}m tenure — very likely seeking change (4-5y)`, category: 'career_pattern', signal_strength: 'strong' };
  if (tenureMonths < 84) return { value: 72, weight, reason: `${tenureMonths}m tenure — long tenure, may want fresh challenges`, category: 'career_pattern', signal_strength: 'moderate' };
  return { value: 55, weight, reason: `${tenureMonths}m tenure — deeply established, less likely to move`, category: 'career_pattern', signal_strength: 'moderate' };
}

function calcCareerVelocity(velocityScore: number | null): Factor {
  const weight = 0.06;

  if (velocityScore == null) {
    return { value: 50, weight, reason: 'Career velocity unknown', category: 'career_pattern', signal_strength: 'none' };
  }

  // Ambitious, fast-progressing candidates change more often
  if (velocityScore >= 80) return { value: 88, weight, reason: 'Rapid career progression — ambitious, likely seeking growth', category: 'career_pattern', signal_strength: 'strong' };
  if (velocityScore >= 60) return { value: 72, weight, reason: 'Above-average career velocity', category: 'career_pattern', signal_strength: 'moderate' };
  if (velocityScore >= 40) return { value: 52, weight, reason: 'Steady career progression', category: 'career_pattern', signal_strength: 'weak' };
  return { value: 32, weight, reason: 'Slower progression — may prefer stability', category: 'career_pattern', signal_strength: 'weak' };
}

function calcJobHoppingPattern(workHistory: any): Factor {
  const weight = 0.06;

  if (!workHistory || !Array.isArray(workHistory) || workHistory.length < 2) {
    return { value: 50, weight, reason: 'Insufficient work history for pattern analysis', category: 'career_pattern', signal_strength: 'none' };
  }

  // Calculate average tenure across roles
  let totalMonths = 0;
  let validRoles = 0;

  for (const role of workHistory) {
    const start = role.start_date || role.startDate;
    const end = role.end_date || role.endDate || role.is_current ? new Date().toISOString() : null;

    if (start) {
      const startDate = new Date(start);
      const endDate = end ? new Date(end) : new Date();
      const months = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      totalMonths += months;
      validRoles++;
    }
  }

  if (validRoles < 2) {
    return { value: 50, weight, reason: 'Not enough role history to analyze patterns', category: 'career_pattern', signal_strength: 'none' };
  }

  const avgMonths = totalMonths / validRoles;

  // Frequent movers (avg < 18m) are statistically more likely to move again
  if (avgMonths < 12) return { value: 90, weight, reason: `Frequent mover: avg ${Math.round(avgMonths)}m per role — high change likelihood`, category: 'career_pattern', signal_strength: 'strong' };
  if (avgMonths < 24) return { value: 78, weight, reason: `Above-average turnover: avg ${Math.round(avgMonths)}m per role`, category: 'career_pattern', signal_strength: 'moderate' };
  if (avgMonths < 36) return { value: 60, weight, reason: `Standard tenure pattern: avg ${Math.round(avgMonths)}m per role`, category: 'career_pattern', signal_strength: 'moderate' };
  if (avgMonths < 60) return { value: 42, weight, reason: `Loyal pattern: avg ${Math.round(avgMonths)}m per role`, category: 'career_pattern', signal_strength: 'moderate' };
  return { value: 28, weight, reason: `Very stable: avg ${Math.round(avgMonths)}m per role — prefers long commitments`, category: 'career_pattern', signal_strength: 'moderate' };
}


// ═══════════════════════════════════════════════════════════════
// CATEGORY 4: MARKET & CONTEXT SIGNALS (15% total weight)
// External factors that push or pull.
// ═══════════════════════════════════════════════════════════════

async function calcIndustryDemand(supabase: any, industries: string[] | null): Promise<Factor> {
  const weight = 0.05;

  if (!industries || industries.length === 0) {
    return { value: 55, weight, reason: 'Industry unknown — assuming neutral demand', category: 'market', signal_strength: 'none' };
  }

  // Fetch hot industries from skills_taxonomy
  let hotIndustries = ['tech', 'ai', 'fintech', 'cybersecurity', 'healthtech', 'climate', 'saas'];
  try {
    const { data: taxData } = await supabase
      .from('skills_taxonomy')
      .select('name')
      .eq('category', 'industry')
      .gte('current_demand_score', 0.7)
      .limit(20);

    if (taxData?.length > 0) {
      hotIndustries = taxData.map((t: any) => t.name.toLowerCase());
    }
  } catch { /* use defaults */ }

  const isInHotIndustry = industries.some(ind =>
    hotIndustries.some(hot => ind.toLowerCase().includes(hot))
  );

  if (isInHotIndustry) {
    return { value: 82, weight, reason: 'In high-demand industry — more opportunities pulling', category: 'market', signal_strength: 'moderate' };
  }

  return { value: 55, weight, reason: 'Standard industry demand', category: 'market', signal_strength: 'weak' };
}

function calcCompensationGap(compCurrent: any, compTarget: any): Factor {
  const weight = 0.05;

  if (!compCurrent && !compTarget) {
    return { value: 50, weight, reason: 'Compensation data unavailable', category: 'market', signal_strength: 'none' };
  }

  // Extract numeric values from various formats
  const current = parseCompensation(compCurrent);
  const target = parseCompensation(compTarget);

  if (current && target && current > 0) {
    const gapPercent = ((target - current) / current) * 100;

    if (gapPercent >= 30) return { value: 92, weight, reason: `Seeking ${Math.round(gapPercent)}% salary increase — strong financial motivation to move`, category: 'market', signal_strength: 'strong' };
    if (gapPercent >= 15) return { value: 78, weight, reason: `Seeking ${Math.round(gapPercent)}% increase — moderate financial motivation`, category: 'market', signal_strength: 'moderate' };
    if (gapPercent >= 5)  return { value: 60, weight, reason: `Seeking ${Math.round(gapPercent)}% increase — slight financial motivation`, category: 'market', signal_strength: 'weak' };
    if (gapPercent >= -5) return { value: 45, weight, reason: 'Compensation expectations aligned with current — neutral', category: 'market', signal_strength: 'weak' };
    return { value: 30, weight, reason: 'Would accept lower compensation — likely seeking non-monetary change', category: 'market', signal_strength: 'weak' };
  }

  // If we only have target but not current, the fact they specified a target is a signal
  if (target && !current) {
    return { value: 65, weight, reason: 'Has specified target compensation — thinking about next move', category: 'market', signal_strength: 'weak' };
  }

  return { value: 50, weight, reason: 'Partial compensation data', category: 'market', signal_strength: 'none' };
}

function parseCompensation(comp: any): number | null {
  if (!comp) return null;
  if (typeof comp === 'number') return comp;
  if (typeof comp === 'string') {
    const num = parseFloat(comp.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? null : num;
  }
  // Handle JSON objects like { amount: 80000, currency: 'EUR' }
  if (typeof comp === 'object') {
    return comp.amount || comp.base || comp.total || comp.salary || null;
  }
  return null;
}

function calcSeniorityMobility(seniority: string | null, yearsExp: number | null): Factor {
  const weight = 0.05;

  if (!seniority) {
    return { value: 50, weight, reason: 'Seniority level unknown', category: 'market', signal_strength: 'none' };
  }

  const level = seniority.toLowerCase();

  // Mid-level professionals move most frequently (research-backed)
  // Juniors are locked into learning, seniors have golden handcuffs, C-suite has long notice
  if (level.includes('junior') || level.includes('entry')) {
    return { value: 55, weight, reason: 'Junior level — moderate mobility, often limited by experience requirements', category: 'market', signal_strength: 'weak' };
  }
  if (level.includes('mid') || level.includes('intermediate')) {
    return { value: 80, weight, reason: 'Mid-level — highest market mobility and demand', category: 'market', signal_strength: 'moderate' };
  }
  if (level.includes('senior') && !level.includes('lead') && !level.includes('principal')) {
    return { value: 75, weight, reason: 'Senior level — strong market demand, high mobility', category: 'market', signal_strength: 'moderate' };
  }
  if (level.includes('lead') || level.includes('principal') || level.includes('staff')) {
    return { value: 62, weight, reason: 'Lead/Principal — selective opportunities, moderate mobility', category: 'market', signal_strength: 'weak' };
  }
  if (level.includes('director') || level.includes('vp') || level.includes('head of')) {
    return { value: 48, weight, reason: 'Director/VP — fewer positions, longer search cycles', category: 'market', signal_strength: 'weak' };
  }
  if (level.includes('c-level') || level.includes('cto') || level.includes('ceo') || level.includes('cfo')) {
    return { value: 35, weight, reason: 'C-suite — very selective, long decision cycles', category: 'market', signal_strength: 'weak' };
  }

  return { value: 55, weight, reason: `${seniority} — standard mobility`, category: 'market', signal_strength: 'weak' };
}


// ═══════════════════════════════════════════════════════════════
// CATEGORY 5: RELATIONSHIP SIGNALS (5% total weight)
// How warm is our connection — affects our ability to convert.
// ═══════════════════════════════════════════════════════════════

function calcRelationshipStrength(relationship: any): Factor {
  const weight = 0.05;

  if (!relationship) {
    return { value: 35, weight, reason: 'No established relationship', category: 'relationship', signal_strength: 'none' };
  }

  const strength = relationship.relationship_strength;
  const strengthMap: Record<string, { value: number; reason: string; s: Factor['signal_strength'] }> = {
    'advocate': { value: 92, reason: 'Strong advocate — trusts TQC, high conversion likelihood', s: 'strong' },
    'strong':   { value: 82, reason: 'Strong relationship — likely to engage seriously', s: 'moderate' },
    'warm':     { value: 65, reason: 'Warm relationship — positive engagement history', s: 'moderate' },
    'warming':  { value: 48, reason: 'Relationship building — early stage trust', s: 'weak' },
    'cold':     { value: 25, reason: 'Cold relationship — needs significant nurturing', s: 'weak' },
  };

  const match = strengthMap[strength || ''];
  if (match) {
    return { value: match.value, weight, reason: match.reason, category: 'relationship', signal_strength: match.s };
  }

  return { value: 35, weight, reason: 'Relationship strength unclassified', category: 'relationship', signal_strength: 'none' };
}


// ═══════════════════════════════════════════════════════════════
// RECOMMENDATION ENGINE
// ═══════════════════════════════════════════════════════════════

function getRecommendation(score: number, confidence: number, factors: Record<string, Factor>): string {
  const lowConfidence = confidence < 40;

  if (score >= 80) {
    return lowConfidence
      ? 'High probability signals detected but limited data. Verify with direct outreach — could be a strong opportunity.'
      : 'Priority candidate: Multiple signals indicate readiness to move. Reach out with a tailored opportunity immediately.';
  }
  if (score >= 65) {
    return lowConfidence
      ? 'Moderate signals present. Gather more data through a casual check-in to better assess timing.'
      : 'Good prospect: Schedule a warm conversation to explore timing and preferences. Stay top of mind.';
  }
  if (score >= 45) {
    return 'Moderate potential: Maintain regular contact and nurture the relationship. Monitor for signal changes.';
  }
  if (score >= 30) {
    return 'Long-term prospect: Keep on radar with periodic touchpoints. Focus on relationship building.';
  }
  return 'Low move likelihood currently. Maintain quarterly check-ins and watch for trigger events.';
}
