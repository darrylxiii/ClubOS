export interface Assessment {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  category: 'personality' | 'skills' | 'culture' | 'technical';
  estimatedTime: number; // minutes
  isActive: boolean;
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
