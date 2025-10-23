export const PRIZE_AMOUNTS = [
  0.01, 0.10, 0.50, 1, 5, 10, 25, 50, 100, 250, 500, 
  1000, 5000, 10000, 25000, 50000, 75000, 100000, 
  200000, 300000, 400000, 500000, 750000, 
  1000000, 2500000, 5000000
];

export interface BriefCase {
  id: number;
  amount: number;
  opened: boolean;
}

export interface RoundDecision {
  round: number;
  timestamp: string;
  casesOpened: number[];
  timePerCaseMs: number[];
  amountsEliminated: number[];
  avgRemainingBefore: number;
  avgRemainingAfter: number;
  bankerOffer: number;
  offerVsEvPercentage: number;
  decision: 'deal' | 'no_deal' | null;
  decisionTimeMs: number;
  hesitationCount: number;
}

export interface PsychologicalProfile {
  riskTolerance: number;
  lossAversionCoefficient: number;
  decisionQuality: number;
  emotionalRegulation: number;
  pressurePerformance: number;
  analyticalThinking: number;
  strategicPlanning: number;
  regretManagement: number;
  cognitiveBiases: {
    gamblersFallacy: { present: boolean; severity: string };
    anchoringBias: { present: boolean; severity: string };
    sunkCostFallacy: { present: boolean; severity: string };
    optimismBias: { present: boolean; severity: string };
    lossAversion: { present: boolean; severity: string };
  };
  decisionMakingStyle: 'analytical' | 'intuitive' | 'emotional' | 'mixed';
  archetype: string;
}

export interface GameOutcome {
  finalWinnings: number;
  initialCaseNumber: number;
  initialCaseContained: number;
  optimalOutcome: number;
  performanceVsOptimal: number;
  tookDeal: boolean;
  dealRound: number | null;
  swappedFinalCase: boolean;
}

export interface JobMatch {
  title: string;
  matchScore: number;
  strengths: string[];
  concerns: string[];
}

export type GameStage = 'intro' | 'case-selection' | 'playing' | 'banker-offer' | 'final-decision' | 'results';

export interface GameState {
  stage: GameStage;
  cases: BriefCase[];
  playerCase: number | null;
  currentRound: number;
  casesToOpenThisRound: number;
  decisions: RoundDecision[];
  gameStartTime: string;
  lastActionTime: string;
}
