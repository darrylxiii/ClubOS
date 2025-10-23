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
  
  // Psychological adjustments
  const topPrizesEliminated = decisions.some(d => 
    d.amountsEliminated.some(amt => amt >= 1000000)
  );
  
  const rejectedGoodOffers = decisions.filter(d => 
    d.decision === 'no_deal' && d.offerVsEvPercentage > 85
  ).length;
  
  if (topPrizesEliminated) {
    offer *= 1.15; // Sympathy offer
  }
  
  if (rejectedGoodOffers >= 2) {
    offer *= 0.85; // Punishment for greed
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
