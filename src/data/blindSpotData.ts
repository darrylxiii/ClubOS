import { BlindSpotDimension, BlindSpotScenario } from '@/types/assessment';

export const BLIND_SPOT_DIMENSIONS: BlindSpotDimension[] = [
  {
    id: 'coding_speed',
    category: 'technical',
    name: 'Coding Speed',
    description: 'How quickly you can write quality code',
    scenarios: ['scenario_1', 'scenario_8']
  },
  {
    id: 'debugging_skill',
    category: 'technical',
    name: 'Debugging Ability',
    description: 'Your skill at identifying and fixing bugs',
    scenarios: ['scenario_2', 'scenario_9']
  },
  {
    id: 'system_design',
    category: 'technical',
    name: 'System Design',
    description: 'Ability to architect scalable systems',
    scenarios: ['scenario_3', 'scenario_10']
  },
  {
    id: 'communication',
    category: 'soft_skill',
    name: 'Communication Clarity',
    description: 'How clearly you convey complex ideas',
    scenarios: ['scenario_4', 'scenario_11']
  },
  {
    id: 'conflict_resolution',
    category: 'soft_skill',
    name: 'Conflict Resolution',
    description: 'Handling disagreements productively',
    scenarios: ['scenario_5', 'scenario_12']
  },
  {
    id: 'empathy',
    category: 'soft_skill',
    name: 'Empathy',
    description: 'Understanding others\' perspectives',
    scenarios: ['scenario_6', 'scenario_13']
  },
  {
    id: 'time_management',
    category: 'work_habit',
    name: 'Time Management',
    description: 'Organizing and prioritizing work effectively',
    scenarios: ['scenario_7', 'scenario_14']
  },
  {
    id: 'attention_to_detail',
    category: 'work_habit',
    name: 'Attention to Detail',
    description: 'Catching small but important issues',
    scenarios: ['scenario_1', 'scenario_15']
  },
  {
    id: 'adaptability',
    category: 'work_habit',
    name: 'Adaptability',
    description: 'Adjusting to change and uncertainty',
    scenarios: ['scenario_2', 'scenario_16']
  },
  {
    id: 'initiative',
    category: 'work_habit',
    name: 'Proactive Initiative',
    description: 'Taking action without being asked',
    scenarios: ['scenario_3', 'scenario_17']
  }
];

export const BLIND_SPOT_SCENARIOS: BlindSpotScenario[] = [
  {
    id: 'scenario_1',
    title: 'Code Review Feedback',
    description: 'A senior developer leaves detailed feedback on your pull request pointing out several edge cases you missed. How do you typically react?',
    dimensionsTested: ['coding_speed', 'attention_to_detail'],
    choices: [
      {
        id: 'a',
        text: 'Feel frustrated that they\'re nitpicking and defend my approach',
        scores: { coding_speed: 1, attention_to_detail: -1 }
      },
      {
        id: 'b',
        text: 'Carefully review each comment and fix all issues before asking questions',
        scores: { coding_speed: 0, attention_to_detail: 2 }
      },
      {
        id: 'c',
        text: 'Quickly fix the obvious issues but skip the minor ones to save time',
        scores: { coding_speed: 1, attention_to_detail: -1 }
      },
      {
        id: 'd',
        text: 'Thank them for the feedback and schedule a call to understand their concerns better',
        scores: { coding_speed: 0, attention_to_detail: 1 }
      }
    ]
  },
  {
    id: 'scenario_2',
    title: 'Production Bug',
    description: 'A critical bug is reported in production affecting 10% of users. What\'s your first move?',
    dimensionsTested: ['debugging_skill', 'adaptability'],
    choices: [
      {
        id: 'a',
        text: 'Immediately start rolling back the recent deployment',
        scores: { debugging_skill: 0, adaptability: 1 }
      },
      {
        id: 'b',
        text: 'Check logs and monitoring to understand the scope and pattern',
        scores: { debugging_skill: 2, adaptability: 1 }
      },
      {
        id: 'c',
        text: 'Ask the team who made recent changes and assign blame',
        scores: { debugging_skill: -1, adaptability: -1 }
      },
      {
        id: 'd',
        text: 'Try to reproduce the bug locally before taking action',
        scores: { debugging_skill: 1, adaptability: 0 }
      }
    ]
  },
  {
    id: 'scenario_3',
    title: 'System Architecture Disagreement',
    description: 'You propose a microservices architecture but the team prefers a monolith. How do you proceed?',
    dimensionsTested: ['system_design', 'initiative'],
    choices: [
      {
        id: 'a',
        text: 'Push strongly for microservices citing industry best practices',
        scores: { system_design: 1, initiative: 0 }
      },
      {
        id: 'b',
        text: 'Create a detailed comparison document with pros/cons for both approaches',
        scores: { system_design: 2, initiative: 2 }
      },
      {
        id: 'c',
        text: 'Accept the team\'s decision without further discussion',
        scores: { system_design: -1, initiative: -1 }
      },
      {
        id: 'd',
        text: 'Suggest a hybrid approach or pilot project to test both',
        scores: { system_design: 2, initiative: 1 }
      }
    ]
  },
  {
    id: 'scenario_4',
    title: 'Explaining Technical Concept',
    description: 'A non-technical stakeholder asks you to explain API rate limiting. How do you explain it?',
    dimensionsTested: ['communication'],
    choices: [
      {
        id: 'a',
        text: 'Use the technical definition with terms like "429 status codes" and "token bucket algorithm"',
        scores: { communication: -1 }
      },
      {
        id: 'b',
        text: 'Compare it to a bouncer at a club controlling how many people enter per hour',
        scores: { communication: 2 }
      },
      {
        id: 'c',
        text: 'Say "it prevents server overload" without further detail',
        scores: { communication: 0 }
      },
      {
        id: 'd',
        text: 'Draw a simple diagram showing requests flowing through a gate',
        scores: { communication: 2 }
      }
    ]
  },
  {
    id: 'scenario_5',
    title: 'Team Disagreement',
    description: 'Two team members are arguing about whether to refactor old code or build new features. You\'re asked to weigh in.',
    dimensionsTested: ['conflict_resolution'],
    choices: [
      {
        id: 'a',
        text: 'Side with whoever has the stronger technical argument',
        scores: { conflict_resolution: 0 }
      },
      {
        id: 'b',
        text: 'Suggest a compromise: allocate 20% time for refactoring, 80% for features',
        scores: { conflict_resolution: 2 }
      },
      {
        id: 'c',
        text: 'Avoid getting involved and let them figure it out',
        scores: { conflict_resolution: -2 }
      },
      {
        id: 'd',
        text: 'Ask both to present data on technical debt vs. feature value to the team',
        scores: { conflict_resolution: 2 }
      }
    ]
  },
  {
    id: 'scenario_6',
    title: 'Teammate Struggling',
    description: 'You notice a teammate has missed deadlines twice and seems overwhelmed. What do you do?',
    dimensionsTested: ['empathy'],
    choices: [
      {
        id: 'a',
        text: 'Report it to the manager as a performance issue',
        scores: { empathy: -2 }
      },
      {
        id: 'b',
        text: 'Privately ask if they\'re okay and if they need help with anything',
        scores: { empathy: 2 }
      },
      {
        id: 'c',
        text: 'Ignore it - everyone has rough patches',
        scores: { empathy: -1 }
      },
      {
        id: 'd',
        text: 'Offer to pair program on their current task to help them catch up',
        scores: { empathy: 2 }
      }
    ]
  },
  {
    id: 'scenario_7',
    title: 'Competing Priorities',
    description: 'You have a code review due, a bug to fix, and a design doc to write - all today. How do you approach this?',
    dimensionsTested: ['time_management'],
    choices: [
      {
        id: 'a',
        text: 'Try to do all three simultaneously, switching between them',
        scores: { time_management: -1 }
      },
      {
        id: 'b',
        text: 'Tackle them in order received, one at a time',
        scores: { time_management: 0 }
      },
      {
        id: 'c',
        text: 'Assess impact/urgency, prioritize the bug, then code review, then design doc',
        scores: { time_management: 2 }
      },
      {
        id: 'd',
        text: 'Ask your manager which is most important',
        scores: { time_management: 0 }
      }
    ]
  },
  {
    id: 'scenario_8',
    title: 'Tight Deadline Feature',
    description: 'You\'re asked to build a feature in half the time you think it needs. How do you respond?',
    dimensionsTested: ['coding_speed'],
    choices: [
      {
        id: 'a',
        text: 'Say yes and rush through it, accepting lower code quality',
        scores: { coding_speed: 0 }
      },
      {
        id: 'b',
        text: 'Negotiate on scope: what\'s the MVP version we can ship?',
        scores: { coding_speed: 2 }
      },
      {
        id: 'c',
        text: 'Refuse and insist on your original estimate',
        scores: { coding_speed: -1 }
      },
      {
        id: 'd',
        text: 'Work overtime to meet the deadline without compromising quality',
        scores: { coding_speed: 1 }
      }
    ]
  },
  {
    id: 'scenario_9',
    title: 'Intermittent Bug',
    description: 'Users report a bug that you can\'t reproduce locally. It happens randomly in production.',
    dimensionsTested: ['debugging_skill'],
    choices: [
      {
        id: 'a',
        text: 'Close the ticket as "cannot reproduce"',
        scores: { debugging_skill: -2 }
      },
      {
        id: 'b',
        text: 'Add extensive logging around the suspected area and monitor production',
        scores: { debugging_skill: 2 }
      },
      {
        id: 'c',
        text: 'Ask users for more detailed reproduction steps',
        scores: { debugging_skill: 1 }
      },
      {
        id: 'd',
        text: 'Review recent code changes for potential race conditions or edge cases',
        scores: { debugging_skill: 2 }
      }
    ]
  },
  {
    id: 'scenario_10',
    title: 'Scaling Challenge',
    description: 'Your service is hitting performance limits at 10K requests/second. How do you approach scaling?',
    dimensionsTested: ['system_design'],
    choices: [
      {
        id: 'a',
        text: 'Immediately add more servers to handle the load',
        scores: { system_design: 0 }
      },
      {
        id: 'b',
        text: 'Profile the application to find bottlenecks first',
        scores: { system_design: 2 }
      },
      {
        id: 'c',
        text: 'Rewrite the service in a faster language like Go or Rust',
        scores: { system_design: -1 }
      },
      {
        id: 'd',
        text: 'Add caching, optimize database queries, then consider horizontal scaling',
        scores: { system_design: 2 }
      }
    ]
  }
];
