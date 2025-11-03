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

// Pressure Cooker Assessment Types
export interface PressureCookerTask {
  id: string;
  type: 'email' | 'approval' | 'bug' | 'report' | 'meeting' | 'escalation';
  title: string;
  description: string;
  sender: string;
  senderRole: string;
  senderPersonality: 'impatient' | 'detail-oriented' | 'collaborative' | 'demanding';
  urgency: 'critical' | 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  estimatedTime: number;
  dependencies?: string[];
  blocks?: string[]; // Tasks that this task blocks
  arrivalTime: number;
  dueIn?: number;
  isInterrupt?: boolean; // Shows as modal, blocks other work
  emailThread?: Array<{
    from: string;
    timestamp: string;
    message: string;
  }>;
  attachments?: Array<{
    type: 'document' | 'chart' | 'code' | 'spreadsheet';
    name: string;
    preview?: string;
  }>;
  hiddenContext?: string; // Revealed when user clicks "Read More"
  parts?: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
  triggersEscalation?: {
    taskId: string;
    delaySeconds: number;
    condition: 'skip' | 'defer' | 'low_quality';
  };
}

export interface PressureCookerAction {
  taskId: string;
  action: 'complete' | 'delegate' | 'defer' | 'skip' | 'escalate' | 'in_progress';
  timestamp: number;
  timeSpent: number;
  quality?: number; // 50-100, user-selected
  delegationTarget?: 'junior' | 'peer' | 'senior' | 'external';
  responseTemplate?: 'brief' | 'professional' | 'empathetic' | 'urgent';
  notes?: string;
  partId?: string; // For multi-part tasks
  readTime?: number; // Time spent reading before acting
  contextRevealed?: boolean; // Did they click "Read More"?
}

export interface PressureCookerSession {
  id: string;
  user_id: string;
  scenario_seed: string;
  started_at: string;
  completed_at?: string;
  actions: PressureCookerAction[];
  tasks_presented: PressureCookerTask[];
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  avg_response_time_ms: number;
  prioritization_accuracy: number;
  stress_handling_score: number;
  multitasking_ability: number;
  decision_quality: number;
  communication_style: 'brief' | 'detailed' | 'delegator' | 'collaborative';
  focus_level?: number; // 0-100, depletes with actions
  context_switches?: number; // Count of task type changes
  dependency_recognition?: number; // % of dependencies correctly handled
  escalation_triggers?: number; // Count of cascading consequences triggered
}

export interface PressureCookerResult {
  completionRate: number;
  prioritizationAccuracy: number;
  stressHandling: number;
  multitaskingAbility: number;
  decisionQuality: number;
  communicationStyle: string;
  tasksCompleted: number;
  totalTasks: number;
  avgResponseTime: number;
  recommendations: string[];
  focusManagement: number; // How well they managed energy
  dependencyAwareness: number; // Recognition of blocking tasks
  stakeholderSavvy: number; // Handling different personalities
  qualityVsSpeed: 'perfectionist' | 'balanced' | 'speed-focused';
  archetype: string; // "Strategic Delegator", "Methodical Executor", etc.
  outcomeSimulation?: {
    projectDelay: number; // days
    teamSatisfaction: number; // 0-100
    costImpact: number; // dollars
  };
}

// Blind Spot Detector Assessment Types
export interface BlindSpotDimension {
  id: string;
  category: 'technical' | 'soft_skill' | 'work_habit';
  name: string;
  description: string;
  scenarios: string[];
}

export interface BlindSpotSelfRating {
  dimensionId: string;
  selfRating: number;
  confidence: number;
}

export interface BlindSpotScenario {
  id: string;
  title: string;
  description: string;
  dimensionsTested: string[];
  choices: Array<{
    id: string;
    text: string;
    scores: { [dimensionId: string]: number };
  }>;
}

export interface BlindSpotGap {
  dimension: string;
  selfRating: number;
  objectiveRating: number;
  gap: number;
  type: 'blind_spot' | 'hidden_strength' | 'accurate';
}

export interface BlindSpotSession {
  id: string;
  user_id: string;
  started_at: string;
  completed_at?: string;
  self_ratings: BlindSpotSelfRating[];
  scenario_responses: Array<{
    scenarioId: string;
    choiceId: string;
    timestamp: string;
    timeSpent: number;
  }>;
  objective_scores: { [dimensionId: string]: number };
  awareness_gaps: BlindSpotGap[];
  overall_self_awareness_score: number;
  coachability_indicator: number;
  top_blind_spots: string[];
  hidden_strengths: string[];
}

export interface BlindSpotResult {
  selfAwarenessScore: number;
  coachabilityScore: number;
  gaps: BlindSpotGap[];
  topBlindSpots: string[];
  hiddenStrengths: string[];
  dimensionScores: { [key: string]: { self: number; objective: number } };
}

// Values Poker Assessment Types
export interface WorkValue {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: 'growth' | 'stability' | 'impact' | 'lifestyle' | 'financial';
}

export interface ValueAllocation {
  valueId: string;
  points: number;
}

export interface ValueTradeoffScenario {
  id: string;
  title: string;
  description: string;
  optionA: {
    text: string;
    values: { [valueId: string]: number };
  };
  optionB: {
    text: string;
    values: { [valueId: string]: number };
  };
}

export interface ValuesPokerSession {
  id: string;
  user_id: string;
  started_at: string;
  completed_at?: string;
  stated_priorities: ValueAllocation[];
  tradeoff_responses: Array<{
    scenarioId: string;
    choice: 'A' | 'B';
    timestamp: string;
    timeSpent: number;
  }>;
  revealed_priorities: ValueAllocation[];
  consistency_score: number;
  value_archetype: string;
  culture_fit_scores: { [companyId: string]: number };
  red_flags: string[];
}

export interface ValuesPokerResult {
  archetype: string;
  consistencyScore: number;
  statedPriorities: ValueAllocation[];
  revealedPriorities: ValueAllocation[];
  topValues: string[];
  cultureFitScores: { [key: string]: number };
  redFlags: string[];
}
