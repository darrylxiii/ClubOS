import { RoundDecision, PsychologicalProfile, GameOutcome } from '@/types/miljoenenjacht';

export function calculatePsychologicalProfile(
  decisions: RoundDecision[],
  outcome: GameOutcome
): PsychologicalProfile {
  const riskTolerance = calculateRiskTolerance(decisions, outcome);
  const lossAversionCoefficient = calculateLossAversion(decisions);
  const decisionQuality = calculateDecisionQuality(decisions);
  const emotionalRegulation = calculateEmotionalRegulation(decisions);
  const pressurePerformance = calculatePressurePerformance(decisions);
  const analyticalThinking = calculateAnalyticalThinking(decisions);
  const strategicPlanning = calculateStrategicPlanning(decisions);
  const regretManagement = calculateRegretManagement(decisions, outcome);
  
  return {
    riskTolerance,
    lossAversionCoefficient,
    decisionQuality,
    emotionalRegulation,
    pressurePerformance,
    analyticalThinking,
    strategicPlanning,
    regretManagement,
    cognitiveBiases: detectCognitiveBiases(decisions),
    decisionMakingStyle: determineDecisionStyle(decisions),
    archetype: determineArchetype(riskTolerance, decisionQuality, emotionalRegulation)
  };
}

function calculateRiskTolerance(decisions: RoundDecision[], outcome: GameOutcome): number {
  let score = 50;
  
  decisions.forEach(d => {
    if (d.decision === 'no_deal') {
      if (d.offerVsEvPercentage < 50) score += 5;
      if (d.offerVsEvPercentage > 80) score += 15;
      
      const hasTopPrizes = d.amountsEliminated.some(amt => amt >= 1000000);
      if (hasTopPrizes) score += 10;
    }
  });
  
  if (outcome.tookDeal && outcome.dealRound && outcome.dealRound < 5) score -= 20;
  if (outcome.tookDeal && decisions[outcome.dealRound - 1]?.offerVsEvPercentage < 70) score -= 10;
  if (!outcome.tookDeal) score += 25;
  
  return Math.max(0, Math.min(100, score));
}

function calculateLossAversion(decisions: RoundDecision[]): number {
  let coefficient = 2.0;
  
  decisions.forEach(d => {
    if (d.decision === 'deal' && d.offerVsEvPercentage < 80) {
      coefficient += 0.15;
    }
    if (d.decision === 'no_deal' && d.avgRemainingAfter < d.avgRemainingBefore * 0.5) {
      coefficient -= 0.1;
    }
  });
  
  return Math.max(1.0, Math.min(4.0, coefficient));
}

function calculateDecisionQuality(decisions: RoundDecision[]): number {
  let totalPoints = 0;
  let possiblePoints = 0;
  
  decisions.forEach(d => {
    if (d.decision) {
      possiblePoints += 10;
      
      if (d.offerVsEvPercentage < 70 && d.decision === 'no_deal') {
        totalPoints += 10;
      } else if (d.offerVsEvPercentage > 90 && d.decision === 'deal') {
        totalPoints += 10;
      } else if (d.offerVsEvPercentage >= 70 && d.offerVsEvPercentage <= 90) {
        totalPoints += 7;
      }
    }
  });
  
  return possiblePoints > 0 ? Math.round((totalPoints / possiblePoints) * 100) : 70;
}

function calculateEmotionalRegulation(decisions: RoundDecision[]): number {
  let score = 70;
  
  const decisionTimes = decisions.map(d => d.decisionTimeMs);
  const variance = calculateVariance(decisionTimes);
  
  if (variance > 50000) score -= 15;
  
  const hesitations = decisions.reduce((sum, d) => sum + d.hesitationCount, 0);
  if (hesitations > decisions.length * 3) score -= 10;
  
  let previousQuality = 0;
  decisions.forEach((d, i) => {
    if (i > 0) {
      const currentQuality = d.offerVsEvPercentage > 80 ? 
        (d.decision === 'deal' ? 1 : 0) : 
        (d.decision === 'no_deal' ? 1 : 0);
      
      if (currentQuality < previousQuality && d.amountsEliminated.some(amt => amt >= 500000)) {
        score -= 10;
      }
      previousQuality = currentQuality;
    }
  });
  
  return Math.max(0, Math.min(100, score));
}

function calculatePressurePerformance(decisions: RoundDecision[]): number {
  let score = 70;
  
  const laterDecisions = decisions.slice(Math.floor(decisions.length / 2));
  const laterDecisionQuality = laterDecisions.filter(d => {
    if (!d.decision) return false;
    return (d.offerVsEvPercentage > 85 && d.decision === 'deal') ||
           (d.offerVsEvPercentage < 75 && d.decision === 'no_deal');
  }).length;
  
  score += (laterDecisionQuality / laterDecisions.length) * 30;
  
  const avgLateDecisionTime = laterDecisions.reduce((sum, d) => sum + d.decisionTimeMs, 0) / laterDecisions.length;
  const avgEarlyDecisionTime = decisions.slice(0, 2).reduce((sum, d) => sum + d.decisionTimeMs, 0) / 2;
  
  if (avgLateDecisionTime < avgEarlyDecisionTime * 1.5) score += 10;
  
  return Math.max(0, Math.min(100, score));
}

function calculateAnalyticalThinking(decisions: RoundDecision[]): number {
  let score = 50;
  
  const avgDecisionTime = decisions.reduce((sum, d) => sum + d.decisionTimeMs, 0) / decisions.length;
  if (avgDecisionTime > 15000) score += 20;
  
  const thoughtfulDecisions = decisions.filter(d => {
    const isRational = (d.offerVsEvPercentage > 85 && d.decision === 'deal') ||
                      (d.offerVsEvPercentage < 75 && d.decision === 'no_deal');
    return isRational;
  }).length;
  
  score += (thoughtfulDecisions / decisions.length) * 30;
  
  return Math.max(0, Math.min(100, score));
}

function calculateStrategicPlanning(decisions: RoundDecision[]): number {
  let score = 50;
  
  const hasConsistentStrategy = decisions.every((d, i) => {
    if (i === 0) return true;
    const prev = decisions[i - 1];
    return Math.abs(d.decisionTimeMs - prev.decisionTimeMs) < 20000;
  });
  
  if (hasConsistentStrategy) score += 25;
  
  const rejectedLowOffers = decisions.filter(d => 
    d.decision === 'no_deal' && d.offerVsEvPercentage < 60
  ).length;
  
  if (rejectedLowOffers === decisions.filter(d => d.offerVsEvPercentage < 60).length) {
    score += 25;
  }
  
  return Math.max(0, Math.min(100, score));
}

function calculateRegretManagement(decisions: RoundDecision[], outcome: GameOutcome): number {
  let score = 70;
  
  if (outcome.tookDeal) {
    const wouldHaveWonMore = outcome.initialCaseContained > outcome.finalWinnings;
    if (!wouldHaveWonMore) score += 20;
  }
  
  const optimalDiff = Math.abs(outcome.performanceVsOptimal);
  if (optimalDiff < 20) score += 10;
  
  return Math.max(0, Math.min(100, score));
}

function detectCognitiveBiases(decisions: RoundDecision[]) {
  return {
    gamblersFallacy: detectGamblersFallacy(decisions),
    anchoringBias: detectAnchoringBias(decisions),
    sunkCostFallacy: detectSunkCostFallacy(decisions),
    optimismBias: detectOptimismBias(decisions),
    lossAversion: detectLossAversionBias(decisions)
  };
}

function detectGamblersFallacy(decisions: RoundDecision[]) {
  const aggressiveAfterLosses = decisions.filter((d, i) => {
    if (i === 0) return false;
    const prevLoss = decisions[i - 1].amountsEliminated.some(amt => amt >= 500000);
    return prevLoss && d.decision === 'no_deal' && d.offerVsEvPercentage > 70;
  }).length;
  
  return {
    present: aggressiveAfterLosses >= 2,
    severity: aggressiveAfterLosses >= 3 ? 'high' : aggressiveAfterLosses >= 2 ? 'moderate' : 'none'
  };
}

function detectAnchoringBias(decisions: RoundDecision[]) {
  if (decisions.length < 3) return { present: false, severity: 'none' };
  
  const firstOffer = decisions[0].bankerOffer;
  const subsequentComparisons = decisions.slice(1).filter(d => 
    Math.abs(d.bankerOffer - firstOffer) / firstOffer < 0.2
  ).length;
  
  return {
    present: subsequentComparisons >= 2,
    severity: subsequentComparisons >= 3 ? 'high' : 'moderate'
  };
}

function detectSunkCostFallacy(decisions: RoundDecision[]) {
  const continuedAfterBadLuck = decisions.filter((d, i) => {
    if (i < 2) return false;
    const recentLosses = decisions.slice(Math.max(0, i - 2), i)
      .filter(prev => prev.amountsEliminated.some(amt => amt >= 500000)).length;
    return recentLosses >= 2 && d.decision === 'no_deal' && d.offerVsEvPercentage > 80;
  }).length;
  
  return {
    present: continuedAfterBadLuck >= 1,
    severity: continuedAfterBadLuck >= 2 ? 'high' : 'moderate'
  };
}

function detectOptimismBias(decisions: RoundDecision[]) {
  const overlyOptimistic = decisions.filter(d => 
    d.decision === 'no_deal' && 
    d.offerVsEvPercentage > 85 && 
    d.amountsEliminated.some(amt => amt >= 1000000)
  ).length;
  
  return {
    present: overlyOptimistic >= 2,
    severity: overlyOptimistic >= 3 ? 'high' : 'moderate'
  };
}

function detectLossAversionBias(decisions: RoundDecision[]) {
  const earlyDeals = decisions.filter((d, i) => 
    i < 3 && d.decision === 'deal' && d.offerVsEvPercentage < 75
  ).length;
  
  return {
    present: earlyDeals >= 1,
    severity: earlyDeals >= 2 ? 'high' : 'moderate'
  };
}

function determineDecisionStyle(decisions: RoundDecision[]): 'analytical' | 'intuitive' | 'emotional' | 'mixed' {
  const avgDecisionTime = decisions.reduce((sum, d) => sum + d.decisionTimeMs, 0) / decisions.length;
  const avgHesitation = decisions.reduce((sum, d) => sum + d.hesitationCount, 0) / decisions.length;
  
  if (avgDecisionTime > 20000) return 'analytical';
  if (avgHesitation > 4) return 'emotional';
  if (avgDecisionTime < 8000) return 'intuitive';
  return 'mixed';
}

function determineArchetype(risk: number, quality: number, emotion: number): string {
  if (risk > 80 && quality < 60) return 'Reckless Gambler';
  if (risk > 70 && quality > 75) return 'Calculated Risk-Taker';
  if (risk < 40) return 'Safety-First Conservative';
  if (emotion < 50) return 'Emotional Decision-Maker';
  if (quality > 80 && risk < 60) return 'Analytical Optimizer';
  if (risk > 60 && emotion > 70) return 'Confident Navigator';
  if (risk < 50 && quality > 70) return 'Prudent Strategist';
  return 'Balanced Decision-Maker';
}

function calculateVariance(values: number[]): number {
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  return squareDiffs.reduce((sum, v) => sum + v, 0) / values.length;
}
