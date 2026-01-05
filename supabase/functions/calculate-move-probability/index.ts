import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MoveProbabilityFactors {
  tenure_score: { value: number; weight: number; reason: string };
  engagement_score: { value: number; weight: number; reason: string };
  response_rate: { value: number; weight: number; reason: string };
  linkedin_activity: { value: number; weight: number; reason: string };
  career_velocity: { value: number; weight: number; reason: string };
  availability_signal: { value: number; weight: number; reason: string };
  market_conditions: { value: number; weight: number; reason: string };
  relationship_strength: { value: number; weight: number; reason: string };
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

    // Handle batch processing
    const candidateIds = batch_ids || (candidate_id ? [candidate_id] : []);
    
    if (candidateIds.length === 0) {
      throw new Error('No candidate_id or batch_ids provided');
    }

    console.log(`[calculate-move-probability] Processing ${candidateIds.length} candidates`);

    const results = [];

    for (const id of candidateIds) {
      try {
        const result = await calculateForCandidate(supabase, id);
        results.push(result);
      } catch (err) {
        console.error(`[calculate-move-probability] Error for ${id}:`, err);
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
    console.error('[calculate-move-probability] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function calculateForCandidate(supabase: any, candidateId: string) {
  // Fetch candidate data
  const { data: candidate, error: candidateError } = await supabase
    .from('candidate_profiles')
    .select(`
      id,
      tenure_current_months,
      career_velocity_score,
      availability_status,
      enrichment_data,
      engagement_score,
      industries
    `)
    .eq('id', candidateId)
    .single();

  if (candidateError || !candidate) {
    throw new Error(`Candidate not found: ${candidateId}`);
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

  // Calculate each factor
  const factors: MoveProbabilityFactors = {
    tenure_score: calculateTenureScore(candidate.tenure_current_months),
    engagement_score: calculateEngagementScore(relationship),
    response_rate: calculateResponseRateScore(relationship),
    linkedin_activity: calculateLinkedInActivity(candidate.enrichment_data),
    career_velocity: calculateCareerVelocity(candidate.career_velocity_score),
    availability_signal: calculateAvailabilitySignal(candidate.availability_status),
    market_conditions: await calculateMarketConditions(supabase, candidate.industries),
    relationship_strength: calculateRelationshipStrength(relationship?.relationship_strength),
  };

  // Calculate weighted total
  const totalScore = Object.values(factors).reduce((sum, factor) => {
    return sum + (factor.value * factor.weight);
  }, 0);

  // Round to 2 decimal places
  const moveProbability = Math.round(totalScore * 100) / 100;

  // Generate recommendation
  const recommendation = getRecommendation(moveProbability, factors);

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
    console.error('[calculate-move-probability] Update error:', updateError);
    throw updateError;
  }

  // Trigger tier recalculation
  await supabase.rpc('update_candidate_tier', {
    p_candidate_id: candidateId,
    p_reason: 'move_probability_updated'
  });

  console.log(`[calculate-move-probability] Candidate ${candidateId}: ${moveProbability}%`);

  return {
    candidate_id: candidateId,
    move_probability: moveProbability,
    factors,
    recommendation,
  };
}

function calculateTenureScore(tenureMonths: number | null): MoveProbabilityFactors['tenure_score'] {
  const weight = 0.20;
  let value = 50;
  let reason = 'Unknown tenure';

  if (tenureMonths !== null) {
    if (tenureMonths >= 24 && tenureMonths < 48) {
      value = 80;
      reason = '2-4 years: Optimal time for a move';
    } else if (tenureMonths >= 48 && tenureMonths < 72) {
      value = 90;
      reason = '4-6 years: High likelihood of seeking new challenges';
    } else if (tenureMonths >= 72) {
      value = 70;
      reason = '6+ years: May be looking for significant change';
    } else if (tenureMonths >= 12 && tenureMonths < 24) {
      value = 50;
      reason = '1-2 years: Moderate likelihood';
    } else if (tenureMonths < 12) {
      value = 20;
      reason = 'Less than 1 year: Recently moved, unlikely to change';
    }
  }

  return { value, weight, reason };
}

function calculateEngagementScore(relationship: any): MoveProbabilityFactors['engagement_score'] {
  const weight = 0.15;
  
  if (!relationship) {
    return { value: 30, weight, reason: 'No relationship data' };
  }

  const lastContact = relationship.last_meaningful_contact 
    ? new Date(relationship.last_meaningful_contact)
    : null;

  if (!lastContact) {
    return { value: 30, weight, reason: 'No recent contact' };
  }

  const daysSinceContact = Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceContact <= 7) {
    return { value: 95, weight, reason: 'Very engaged: contacted within last week' };
  } else if (daysSinceContact <= 14) {
    return { value: 85, weight, reason: 'Engaged: contacted within last 2 weeks' };
  } else if (daysSinceContact <= 30) {
    return { value: 70, weight, reason: 'Moderately engaged: contacted within last month' };
  } else if (daysSinceContact <= 60) {
    return { value: 50, weight, reason: 'Somewhat engaged: contacted within 2 months' };
  } else if (daysSinceContact <= 90) {
    return { value: 35, weight, reason: 'Low engagement: no contact in 3 months' };
  } else {
    return { value: 20, weight, reason: 'Dormant: no contact in over 3 months' };
  }
}

function calculateResponseRateScore(relationship: any): MoveProbabilityFactors['response_rate'] {
  const weight = 0.15;

  if (!relationship || relationship.response_rate === null) {
    return { value: 40, weight, reason: 'No response data available' };
  }

  const rate = relationship.response_rate;

  if (rate >= 80) {
    return { value: 95, weight, reason: `Excellent response rate: ${rate}%` };
  } else if (rate >= 60) {
    return { value: 80, weight, reason: `Good response rate: ${rate}%` };
  } else if (rate >= 40) {
    return { value: 60, weight, reason: `Moderate response rate: ${rate}%` };
  } else if (rate >= 20) {
    return { value: 40, weight, reason: `Low response rate: ${rate}%` };
  } else {
    return { value: 20, weight, reason: `Very low response rate: ${rate}%` };
  }
}

function calculateLinkedInActivity(enrichmentData: any): MoveProbabilityFactors['linkedin_activity'] {
  const weight = 0.10;

  if (!enrichmentData || !enrichmentData.linkedin_activity_change) {
    return { value: 50, weight, reason: 'No LinkedIn activity data' };
  }

  const activityChange = enrichmentData.linkedin_activity_change;

  if (activityChange >= 30) {
    return { value: 85, weight, reason: `High LinkedIn activity increase: ${activityChange}%` };
  } else if (activityChange >= 10) {
    return { value: 70, weight, reason: `Moderate LinkedIn activity increase: ${activityChange}%` };
  } else if (activityChange > 0) {
    return { value: 55, weight, reason: `Slight LinkedIn activity increase: ${activityChange}%` };
  } else {
    return { value: 40, weight, reason: 'LinkedIn activity stable or declining' };
  }
}

function calculateCareerVelocity(velocityScore: number | null): MoveProbabilityFactors['career_velocity'] {
  const weight = 0.10;

  if (velocityScore === null) {
    return { value: 50, weight, reason: 'Career velocity unknown' };
  }

  if (velocityScore >= 80) {
    return { value: 90, weight, reason: 'Fast career progression: likely ambitious' };
  } else if (velocityScore >= 60) {
    return { value: 75, weight, reason: 'Above average career progression' };
  } else if (velocityScore >= 40) {
    return { value: 55, weight, reason: 'Steady career progression' };
  } else {
    return { value: 35, weight, reason: 'Slow career progression: may prefer stability' };
  }
}

function calculateAvailabilitySignal(status: string | null): MoveProbabilityFactors['availability_signal'] {
  const weight = 0.15;

  switch (status) {
    case 'actively_looking':
      return { value: 100, weight, reason: 'Actively looking for opportunities' };
    case 'passively_open':
      return { value: 80, weight, reason: 'Open to the right opportunity' };
    case 'not_looking':
      return { value: 20, weight, reason: 'Not currently looking' };
    case 'employed_happy':
      return { value: 10, weight, reason: 'Happy in current role' };
    default:
      return { value: 50, weight, reason: 'Availability status unknown' };
  }
}

async function calculateMarketConditions(supabase: any, industries: string[] | null): Promise<MoveProbabilityFactors['market_conditions']> {
  const weight = 0.10;
  
  if (!industries || industries.length === 0) {
    return { value: 60, weight, reason: 'Market conditions: neutral' };
  }

  // Fetch hot industries from skills_taxonomy or use defaults
  let hotIndustries = ['tech', 'ai', 'fintech', 'beauty', 'luxury_fashion'];
  
  try {
    const { data: taxData } = await supabase
      .from('skills_taxonomy')
      .select('name')
      .eq('category', 'industry')
      .gte('current_demand_score', 0.7)
      .limit(20);
    
    if (taxData && taxData.length > 0) {
      hotIndustries = taxData.map((t: any) => t.name.toLowerCase());
    }
  } catch (e) {
    // Use defaults if query fails
    console.log('[calculate-move-probability] Using default hot industries');
  }

  const isInHotIndustry = industries.some(ind => 
    hotIndustries.some(hot => ind.toLowerCase().includes(hot))
  );

  if (isInHotIndustry) {
    return { value: 80, weight, reason: 'Industry with high demand: more opportunities' };
  }

  return { value: 60, weight, reason: 'Standard market conditions' };
}

function calculateRelationshipStrength(strength: string | null): MoveProbabilityFactors['relationship_strength'] {
  const weight = 0.05;

  switch (strength) {
    case 'advocate':
      return { value: 90, weight, reason: 'Strong advocate: high trust relationship' };
    case 'strong':
      return { value: 80, weight, reason: 'Strong relationship: likely to engage' };
    case 'warm':
      return { value: 60, weight, reason: 'Warm relationship: positive engagement' };
    case 'warming':
      return { value: 45, weight, reason: 'Relationship building in progress' };
    case 'cold':
      return { value: 30, weight, reason: 'Cold relationship: needs nurturing' };
    default:
      return { value: 35, weight, reason: 'Relationship strength unknown' };
  }
}

function getRecommendation(score: number, factors: MoveProbabilityFactors): string {
  if (score >= 75) {
    return 'High priority: Reach out immediately with relevant opportunities. This candidate is likely ready to move.';
  } else if (score >= 60) {
    return 'Good prospect: Schedule a warm check-in to explore their career goals and stay top of mind.';
  } else if (score >= 45) {
    return 'Moderate potential: Maintain regular contact and nurture the relationship for future opportunities.';
  } else if (score >= 30) {
    return 'Long-term prospect: Keep in touch periodically and focus on building the relationship.';
  } else {
    return 'Low priority: Focus on other candidates but maintain basic touchpoints quarterly.';
  }
}
