import { Assessment, SwipeScenario } from '@/types/assessment';

export const ASSESSMENTS: Assessment[] = [
  {
    id: 'swipe-game',
    name: 'Would You Rather?',
    description: 'Discover your work personality and culture fit through quick scenario choices.',
    icon: '🃏',
    route: '/assessments/swipe-game',
    category: 'personality',
    estimatedTime: 5,
    isActive: true,
  },
  {
    id: 'miljoenenjacht',
    name: 'Miljoenenjacht',
    description: 'Discover your risk profile and decision-making style through this engaging Deal or No Deal experience.',
    icon: '🎁',
    route: '/assessments/miljoenenjacht',
    category: 'personality',
    estimatedTime: 10,
    isActive: true,
  },
  {
    id: 'incubator-20',
    name: 'Incubator:20',
    description: 'Ship a fundable one-pager in 20 minutes. Showcase your strategic thinking, economic literacy, and AI collaboration skills.',
    icon: '🚀',
    route: '/assessments/incubator-20',
    category: 'strategic',
    estimatedTime: 20,
    isActive: true,
  },
  {
    id: 'pressure-cooker',
    name: 'Pressure Cooker',
    description: 'Simulate a high-pressure workday with competing priorities. Reveals your prioritization skills and stress management.',
    icon: '🔥',
    route: '/assessments/pressure-cooker',
    category: 'skills',
    estimatedTime: 15,
    isActive: true,
  },
  {
    id: 'blind-spot-detector',
    name: 'Blind Spot Detector',
    description: 'Compare your self-perception with objective measurements. Discover hidden strengths and areas for growth.',
    icon: '🔍',
    route: '/assessments/blind-spot-detector',
    category: 'personality',
    estimatedTime: 12,
    isActive: true,
  },
  {
    id: 'values-poker',
    name: 'Values Poker',
    description: 'Allocate value points and make trade-offs to reveal your true work values and culture fit.',
    icon: '🎲',
    route: '/assessments/values-poker',
    category: 'culture',
    estimatedTime: 10,
    isActive: true,
  },
];

export const SWIPE_SCENARIOS: SwipeScenario[] = [
  {
    id: '1',
    text: 'Work on a high-stakes project with tight deadlines',
    category: 'Work Style',
    emoji: '⚡',
    traits: { pressure: 2, speed: 2, autonomy: 1 },
  },
  {
    id: '2',
    text: 'Collaborate with a large, diverse team daily',
    category: 'Teamwork',
    emoji: '👥',
    traits: { collaboration: 2, social: 2, communication: 1 },
  },
  {
    id: '3',
    text: 'Deep-dive into complex technical problems alone',
    category: 'Work Style',
    emoji: '🔬',
    traits: { analytical: 2, autonomy: 2, depth: 1 },
  },
  {
    id: '4',
    text: 'Present your ideas to senior leadership',
    category: 'Communication',
    emoji: '🎤',
    traits: { leadership: 2, communication: 2, confidence: 1 },
  },
  {
    id: '5',
    text: 'Mentor junior team members regularly',
    category: 'Leadership',
    emoji: '🌟',
    traits: { mentorship: 2, patience: 1, teaching: 2 },
  },
  // Add 45 more scenarios for a total of 50
  {
    id: '6',
    text: 'Experiment with cutting-edge technologies',
    category: 'Innovation',
    emoji: '🚀',
    traits: { innovation: 2, curiosity: 2, risk: 1 },
  },
  {
    id: '7',
    text: 'Maintain and improve legacy systems',
    category: 'Work Style',
    emoji: '🔧',
    traits: { stability: 2, detail: 1, patience: 1 },
  },
  {
    id: '8',
    text: 'Work remotely with flexible hours',
    category: 'Environment',
    emoji: '🏡',
    traits: { autonomy: 2, flexibility: 2, independence: 1 },
  },
  {
    id: '9',
    text: 'Attend daily stand-ups and check-ins',
    category: 'Teamwork',
    emoji: '☕',
    traits: { collaboration: 1, structure: 2, communication: 1 },
  },
  {
    id: '10',
    text: 'Lead a cross-functional initiative',
    category: 'Leadership',
    emoji: '🎯',
    traits: { leadership: 2, coordination: 2, vision: 1 },
  },
];

export const SWIPE_ACTIONS = [
  { direction: 'up' as const, points: 2, label: 'Love this!', color: 'text-green-400' },
  { direction: 'right' as const, points: 1, label: 'I like this', color: 'text-blue-400' },
  { direction: 'left' as const, points: -1, label: 'Not for me', color: 'text-orange-400' },
  { direction: 'down' as const, points: -2, label: 'Avoid this', color: 'text-red-400' },
];

export const LOADING_FACTS = [
  'Analyzing your work style preferences...',
  'Mapping your collaboration patterns...',
  'Calculating culture fit scores...',
  'Identifying your unique strengths...',
  'Processing personality indicators...',
  'Matching you with ideal roles...',
];
