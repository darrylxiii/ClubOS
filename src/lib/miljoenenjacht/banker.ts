import { BriefCase, RoundDecision } from '@/types/miljoenenjacht';

const ROUND_PERCENTAGES = [0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95];

export function calculateBankerOffer(
  remainingCases: BriefCase[],
  round: number,
  decisions: RoundDecision[]
): number {
  const remainingAmounts = remainingCases
    .filter(c => !c.opened)
    .map(c => c.amount);
  
  const average = remainingAmounts.reduce((sum, amt) => sum + amt, 0) / remainingAmounts.length;
  const roundPercentage = ROUND_PERCENTAGES[round - 1] || 0.95;
  
  let offer = average * roundPercentage;
  
  // Dynamic difficulty: Behavioral adjustments
  const topPrizesEliminated = decisions.some(d => 
    d.amountsEliminated.some(amt => amt >= 1000000)
  );
  
  const rejectedGoodOffers = decisions.filter(d => 
    d.decision === 'no_deal' && d.offerVsEvPercentage > 85
  ).length;
  
  // Check if player is on a lucky streak (eliminated many small values)
  const recentDecisions = decisions.slice(-2);
  const luckyStreak = recentDecisions.every(d => 
    d.amountsEliminated.every(amt => amt < 50000)
  ) && recentDecisions.length > 0;
  
  // Calculate player's average decision time
  const avgDecisionTime = decisions.length > 0
    ? decisions.reduce((sum, d) => sum + d.decisionTimeMs, 0) / decisions.length
    : 10000;
  
  const isQuickDecider = avgDecisionTime < 5000;
  const isSlowDecider = avgDecisionTime > 15000;
  
  // Psychological adjustments based on behavior
  if (topPrizesEliminated) {
    offer *= 1.15; // Sympathy offer - player lost big prizes
  }
  
  if (rejectedGoodOffers >= 2) {
    offer *= 0.85; // Punishment for greed
  }
  
  if (luckyStreak && round < 5) {
    offer *= 0.90; // Exploit lucky streak - tempt them to continue
  }
  
  if (isQuickDecider && round > 3) {
    offer *= 0.95; // Slightly lower for impulsive players
  }
  
  if (isSlowDecider && round > 3) {
    offer *= 1.05; // Reward analytical players
  }
  
  // High-value concentration bonus
  const highValueCount = remainingAmounts.filter(amt => amt >= 500000).length;
  if (highValueCount >= 4 && round >= 5) {
    offer *= 1.1; // Generous offer when many high values remain
  }
  
  // Early round push
  if (round <= 2 && average > 200000) {
    offer *= 1.2; // Tempting early offer if situation is good
  }
  
  // Round to nice number
  return roundToNiceNumber(offer);
}

function roundToNiceNumber(value: number): number {
  if (value < 100) return Math.round(value);
  if (value < 1000) return Math.round(value / 10) * 10;
  if (value < 10000) return Math.round(value / 100) * 100;
  if (value < 100000) return Math.round(value / 1000) * 1000;
  if (value < 1000000) return Math.round(value / 5000) * 5000;
  return Math.round(value / 10000) * 10000;
}

export function calculateExpectedValue(cases: BriefCase[]): number {
  const remainingAmounts = cases.filter(c => !c.opened).map(c => c.amount);
  return remainingAmounts.reduce((sum, amt) => sum + amt, 0) / remainingAmounts.length;
}
