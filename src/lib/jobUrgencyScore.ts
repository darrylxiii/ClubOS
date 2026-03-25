/**
 * Intelligent Job Urgency Scoring Engine (0-10)
 * 
 * Four weighted layers:
 * - Time Pressure (max 3): days open, deadlines, partner-stated urgency
 * - Pipeline Health (max 3): candidate count, active candidates, conversion
 * - Activity Decay (max 2): staleness of pipeline activity
 * - Intelligence Boost (max 2): CRM hiring urgency, relationship health
 * 
 * Manual override replaces computed score entirely.
 */

export interface UrgencyScoreInput {
  // Job lifecycle
  daysOpen: number;
  expectedCloseDate?: string | null;
  expectedStartDate?: string | null;
  urgency?: string | null; // "immediate", "two_weeks", "one_month", etc.
  hiredCount?: number;
  targetHireCount?: number | null;
  isContinuous?: boolean;
  dealHealthScore?: number | null;

  // Pipeline metrics
  candidateCount: number;
  activeCount: number;
  conversionRate: number | null;
  lastActivityDaysAgo: number;

  // Intelligence (optional)
  hiringUrgencyScore?: number | null; // 0-10 from CRM
  relationshipHealthScore?: number | null; // 0-100 from CRM

  // Manual override
  manualScore?: number | null;
  manualSetBy?: string | null;
  manualSetAt?: string | null;
}

export interface UrgencyScoreBreakdown {
  timePressure: number;
  pipelineHealth: number;
  activityDecay: number;
  intelligenceBoost: number;
}

export interface UrgencyScoreResult {
  dataScore: number;
  manualScore: number | null;
  effectiveScore: number;
  isManual: boolean;
  breakdown: UrgencyScoreBreakdown;
}

function computeTimePressure(input: UrgencyScoreInput): number {
  let score = 0;

  // Days open contribution
  if (input.daysOpen > 60) score += 2;
  else if (input.daysOpen > 30) score += 1.5;
  else if (input.daysOpen > 14) score += 0.5;

  // Past expected close date
  if (input.expectedCloseDate) {
    const closeDate = new Date(input.expectedCloseDate);
    if (closeDate.getTime() < Date.now()) score += 1;
  }

  // Expected start date approaching with no hire
  if (input.expectedStartDate && (!input.hiredCount || input.hiredCount === 0)) {
    const startDate = new Date(input.expectedStartDate);
    const daysUntilStart = Math.floor((startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilStart < 14 && daysUntilStart >= 0) score += 1;
  }

  // Partner-stated urgency
  if (input.urgency === 'immediate') score += 1;
  else if (input.urgency === 'two_weeks') score += 0.5;

  return Math.min(3, score);
}

function computePipelineHealth(input: UrgencyScoreInput): number {
  let score = 0;

  // Zero candidates on any job older than 7 days
  if (input.candidateCount === 0 && input.daysOpen > 7) {
    score += 2;
  } else if (input.candidateCount < 3 && input.daysOpen > 14) {
    score += 1.5;
  }

  // Zero active candidates (all rejected/withdrawn)
  if (input.candidateCount > 0 && input.activeCount === 0) {
    score += 2;
  }

  // Conversion rate
  if (input.conversionRate !== null && input.conversionRate < 5 && input.candidateCount >= 5) {
    score += 0.5;
  }

  // Continuous pipeline: far from target
  if (input.isContinuous && input.targetHireCount && input.targetHireCount > 0) {
    const fillRate = (input.hiredCount || 0) / input.targetHireCount;
    if (fillRate < 0.25 && input.daysOpen > 30) score += 1;
  }

  return Math.min(3, score);
}

function computeActivityDecay(input: UrgencyScoreInput): number {
  if (input.lastActivityDaysAgo > 14) return 2;
  if (input.lastActivityDaysAgo > 7) return 1;
  if (input.lastActivityDaysAgo > 3) return 0.5;
  return 0;
}

function computeIntelligenceBoost(input: UrgencyScoreInput): number {
  let score = 0;

  if (input.hiringUrgencyScore != null) {
    if (input.hiringUrgencyScore > 7) score += 1.5;
    else if (input.hiringUrgencyScore > 5) score += 0.5;
  }

  if (input.relationshipHealthScore != null && input.relationshipHealthScore < 30) {
    score += 0.5;
  }

  return Math.min(2, score);
}

export function computeJobUrgencyScore(input: UrgencyScoreInput): UrgencyScoreResult {
  const breakdown: UrgencyScoreBreakdown = {
    timePressure: computeTimePressure(input),
    pipelineHealth: computePipelineHealth(input),
    activityDecay: computeActivityDecay(input),
    intelligenceBoost: computeIntelligenceBoost(input),
  };

  const rawScore = breakdown.timePressure + breakdown.pipelineHealth + breakdown.activityDecay + breakdown.intelligenceBoost;
  const dataScore = Math.min(10, Math.round(rawScore * 10) / 10);

  const manualScore = input.manualScore ?? null;
  const isManual = manualScore !== null;
  const effectiveScore = isManual ? manualScore : dataScore;

  return { dataScore, manualScore, effectiveScore, isManual, breakdown };
}

/** Color for the urgency score: green (0-3), amber (4-6), red (7-10) */
export function getUrgencyScoreColor(score: number): {
  text: string;
  bg: string;
  border: string;
  ring: string;
} {
  if (score >= 7) return {
    text: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    ring: 'ring-red-500/20',
  };
  if (score >= 4) return {
    text: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    ring: 'ring-amber-500/20',
  };
  return {
    text: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    ring: 'ring-emerald-500/20',
  };
}

/** Raw HSL color for urgency accent (for inline styles) */
export function getUrgencyAccentHsl(score: number): string {
  if (score >= 7) return 'hsl(0, 72%, 51%)';     // red-500
  if (score >= 4) return 'hsl(38, 92%, 50%)';     // amber-500
  return 'hsl(160, 84%, 39%)';                     // emerald-500
}

/** Label for urgency level */
export function getUrgencyLabel(score: number): string {
  if (score >= 8) return 'Critical';
  if (score >= 6) return 'High';
  if (score >= 4) return 'Medium';
  if (score >= 2) return 'Low';
  return 'Healthy';
}
