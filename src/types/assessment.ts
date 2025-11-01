export interface Assessment {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  category: 'personality' | 'skills' | 'culture' | 'technical' | 'strategic';
  estimatedTime: number; // minutes
  isActive: boolean;
}

export interface IncubatorScenario {
  id: string;
  industry: string;
  customer: string;
  constraint: string;
  budget: number;
  stage: 'Research' | 'Prototype' | 'Pilot' | 'Early Revenue';
  region: string;
  twist: string;
  difficulty: number;
  title: string;
}

export interface IncubatorFrameAnswers {
  problem: string;
  customer: string;
  successMetric: string;
}

export interface IncubatorPlanSection {
  problem: string;
  solution: string;
  gtm: string;
  unitEconomics: string;
  executionPlan: string;
  risks: string;
}

export interface IncubatorSession {
  id: string;
  user_id: string;
  scenario_seed: IncubatorScenario;
  started_at: string;
  frame_problem?: string;
  frame_customer?: string;
  frame_success_metric?: string;
  final_plan?: IncubatorPlanSection;
  word_count?: number;
  total_score?: number;
  normalized_score?: number;
}

export interface SwipeScenario {
  id: string;
  text: string;
  category: string;
  emoji: string;
  traits: {
    [key: string]: number; // trait name -> weight
  };
}

export interface SwipeResult {
  score: number;
  archetype: string;
  traits: {
    [key: string]: number;
  };
  topStrengths: string[];
  growthAreas: string[];
  recommendedJobs: Array<{
    title: string;
    match: number;
  }>;
}

export type SwipeDirection = 'up' | 'right' | 'left' | 'down';

export interface SwipeAction {
  direction: SwipeDirection;
  points: number;
  label: string;
}
