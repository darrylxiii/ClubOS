/**
 * Unified Scoring System
 * Consolidates ML prediction, activity engagement, profile completeness, and stage progression
 * into a single scoring framework used across all views.
 */

export interface ScoringWeights {
  mlPrediction: number;
  activity: number;
  completeness: number;
  stageProgress: number;
  assessment: number;
  interview: number;
}

export interface ScoreBreakdown {
  mlPrediction: number;
  activity: number;
  completeness: number;
  stageProgress: number;
  assessment: number;
  interview: number;
}

export interface UnifiedScore {
  score: number;
  breakdown: ScoreBreakdown;
  confidence: number;
  recommendation: string | null;
  tier: 'exceptional' | 'strong' | 'good' | 'fair' | 'developing';
}

export interface ScoringInput {
  // ML/Base scores
  mlPredictionScore?: number; // 0-1 from ML model
  matchScore?: number; // 0-100 legacy match score
  
  // Activity signals
  lastActivityAt?: string | null;
  engagementScore?: number; // 0-1
  
  // Profile signals
  profileCompleteness?: number; // 0-100
  
  // Stage/Pipeline
  currentStageIndex?: number;
  totalStages?: number;
  
  // Assessment & Interview
  assessmentScore?: number; // 0-1
  interviewPerformance?: number | null; // 0-1
  interviewCount?: number;
  assessmentCount?: number;
}

// Default weights matching ML baseline priorities
const DEFAULT_WEIGHTS: ScoringWeights = {
  mlPrediction: 0.35,
  activity: 0.15,
  completeness: 0.15,
  stageProgress: 0.10,
  assessment: 0.15,
  interview: 0.10,
};

/**
 * Calculate activity score based on recency of last activity
 */
function calculateActivityScore(lastActivityAt: string | null | undefined): number {
  if (!lastActivityAt) return 0;
  
  const daysSinceActivity = (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceActivity < 2) return 100;
  if (daysSinceActivity < 7) return 80;
  if (daysSinceActivity < 14) return 60;
  if (daysSinceActivity < 30) return 40;
  return 20;
}

/**
 * Calculate stage progress score
 */
function calculateStageProgressScore(
  currentStageIndex: number | undefined,
  totalStages: number | undefined
): number {
  if (!totalStages || totalStages === 0) return 0;
  const current = currentStageIndex ?? 0;
  return Math.round((current / totalStages) * 100);
}

/**
 * Get scoring tier based on composite score
 */
function getScoreTier(score: number): UnifiedScore['tier'] {
  if (score >= 90) return 'exceptional';
  if (score >= 75) return 'strong';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'developing';
}

/**
 * Generate AI recommendation based on scoring factors
 */
function generateRecommendation(breakdown: ScoreBreakdown, score: number): string | null {
  if (score < 40) return null;
  
  // Find the strongest factor
  const factors = [
    { name: 'Skills Match', value: breakdown.mlPrediction, threshold: 80 },
    { name: 'Highly Engaged', value: breakdown.activity, threshold: 80 },
    { name: 'Complete Profile', value: breakdown.completeness, threshold: 95 },
    { name: 'Advanced Stage', value: breakdown.stageProgress, threshold: 60 },
    { name: 'Strong Assessment', value: breakdown.assessment, threshold: 75 },
    { name: 'Interview Star', value: breakdown.interview, threshold: 75 },
  ];
  
  const strongFactors = factors.filter(f => f.value >= f.threshold);
  
  if (strongFactors.length === 0) return null;
  
  // Prioritize factors
  if (score >= 85) {
    if (breakdown.mlPrediction >= 90) return "Top 1% Skills Match";
    if (breakdown.activity >= 90) return "Highly Engaged Candidate";
    if (breakdown.stageProgress >= 80) return "Final Stages - High Priority";
    return "Excellent Overall Profile";
  }
  
  if (score >= 70) {
    if (breakdown.mlPrediction >= 80) return "Strong Skills Fit";
    if (breakdown.completeness >= 100) return "Fully Completed Profile";
    if (breakdown.assessment >= 80) return "Strong Assessment Results";
  }
  
  return strongFactors[0]?.name || null;
}

/**
 * Calculate confidence score based on data availability
 */
function calculateConfidence(input: ScoringInput): number {
  let dataPoints = 0;
  let availablePoints = 0;
  
  // Check each data point
  const checks = [
    { available: input.mlPredictionScore !== undefined || input.matchScore !== undefined, weight: 2 },
    { available: !!input.lastActivityAt, weight: 1 },
    { available: input.profileCompleteness !== undefined, weight: 1 },
    { available: input.currentStageIndex !== undefined, weight: 1 },
    { available: input.assessmentScore !== undefined, weight: 1.5 },
    { available: input.interviewPerformance !== undefined, weight: 1.5 },
  ];
  
  checks.forEach(check => {
    dataPoints += check.weight;
    if (check.available) availablePoints += check.weight;
  });
  
  return Math.round((availablePoints / dataPoints) * 100);
}

/**
 * Main unified scoring function
 * Combines all scoring signals into a single composite score
 */
export function calculateUnifiedScore(
  input: ScoringInput,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): UnifiedScore {
  // Normalize ML prediction score (could come from ML model 0-1 or legacy 0-100)
  const mlScore = input.mlPredictionScore !== undefined
    ? input.mlPredictionScore * 100
    : input.matchScore ?? 0;
  
  // Calculate individual component scores
  const activityScore = input.engagementScore !== undefined
    ? input.engagementScore * 100
    : calculateActivityScore(input.lastActivityAt);
  
  const completenessScore = input.profileCompleteness ?? 0;
  
  const stageScore = calculateStageProgressScore(
    input.currentStageIndex,
    input.totalStages
  );
  
  // Assessment score with boost for having assessments
  const assessmentScore = input.assessmentScore !== undefined
    ? input.assessmentScore * 100
    : (input.assessmentCount ?? 0) > 0 ? 50 : 0;
  
  // Interview score (neutral if no data)
  let interviewScore = 50; // neutral baseline
  if (input.interviewPerformance !== undefined && input.interviewPerformance !== null) {
    interviewScore = input.interviewPerformance * 100;
  } else if ((input.interviewCount ?? 0) > 0) {
    interviewScore = 60; // slight boost for having interviews
  }
  
  // Build breakdown
  const breakdown: ScoreBreakdown = {
    mlPrediction: Math.round(mlScore),
    activity: Math.round(activityScore),
    completeness: Math.round(completenessScore),
    stageProgress: Math.round(stageScore),
    assessment: Math.round(assessmentScore),
    interview: Math.round(interviewScore),
  };
  
  // Calculate weighted composite score
  const compositeScore = Math.round(
    (breakdown.mlPrediction * weights.mlPrediction) +
    (breakdown.activity * weights.activity) +
    (breakdown.completeness * weights.completeness) +
    (breakdown.stageProgress * weights.stageProgress) +
    (breakdown.assessment * weights.assessment) +
    (breakdown.interview * weights.interview)
  );
  
  // Clamp to 0-100
  const finalScore = Math.min(100, Math.max(0, compositeScore));
  
  return {
    score: finalScore,
    breakdown,
    confidence: calculateConfidence(input),
    recommendation: generateRecommendation(breakdown, finalScore),
    tier: getScoreTier(finalScore),
  };
}

/**
 * Get display color for score tier
 */
export function getScoreTierColor(tier: UnifiedScore['tier']): string {
  const colors: Record<UnifiedScore['tier'], string> = {
    exceptional: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    strong: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
    good: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20',
    fair: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    developing: 'text-muted-foreground bg-muted border-border',
  };
  return colors[tier];
}

/**
 * Get display label for score tier
 */
export function getScoreTierLabel(tier: UnifiedScore['tier']): string {
  const labels: Record<UnifiedScore['tier'], string> = {
    exceptional: 'Exceptional',
    strong: 'Strong',
    good: 'Good',
    fair: 'Fair',
    developing: 'Developing',
  };
  return labels[tier];
}

// Re-export legacy interface for backward compatibility
export interface CandidateScore {
  compositeScore: number;
  breakdown: {
    match: number;
    activity: number;
    completeness: number;
  };
  aiRecommendation?: string;
}

/**
 * Legacy compatibility wrapper for candidateScoring.ts consumers
 * @deprecated Use calculateUnifiedScore instead
 */
export function calculateCandidateScoreLegacy(
  candidate: {
    match_score?: number;
    last_activity_at?: string | null;
    profile_completeness?: number;
    current_stage_index?: number;
  },
  maxStageIndex: number = 5
): CandidateScore {
  const unified = calculateUnifiedScore({
    matchScore: candidate.match_score,
    lastActivityAt: candidate.last_activity_at,
    profileCompleteness: candidate.profile_completeness,
    currentStageIndex: candidate.current_stage_index,
    totalStages: maxStageIndex,
  });
  
  return {
    compositeScore: unified.score,
    breakdown: {
      match: unified.breakdown.mlPrediction,
      activity: unified.breakdown.activity,
      completeness: unified.breakdown.completeness,
    },
    aiRecommendation: unified.recommendation ?? undefined,
  };
}
