import { WorkValue, ValueTradeoffScenario } from '@/types/assessment';

export const WORK_VALUES: WorkValue[] = [
  {
    id: 'autonomy',
    name: 'Autonomy',
    emoji: '🗝️',
    category: 'lifestyle',
    description: 'Freedom to make your own decisions and work independently'
  },
  {
    id: 'impact',
    name: 'Impact',
    emoji: '🌍',
    category: 'impact',
    description: 'Making a meaningful contribution to society or users'
  },
  {
    id: 'growth',
    name: 'Learning & Growth',
    emoji: '📈',
    category: 'growth',
    description: 'Continuous skill development and career advancement'
  },
  {
    id: 'stability',
    name: 'Job Security',
    emoji: '🛡️',
    category: 'stability',
    description: 'Predictable, stable career with low risk'
  },
  {
    id: 'compensation',
    name: 'High Compensation',
    emoji: '💰',
    category: 'financial',
    description: 'Top-tier salary, bonus, and equity opportunities'
  },
  {
    id: 'work_life_balance',
    name: 'Work-Life Balance',
    emoji: '⚖️',
    category: 'lifestyle',
    description: 'Time for personal life, hobbies, and family'
  },
  {
    id: 'prestige',
    name: 'Prestige & Status',
    emoji: '⭐',
    category: 'financial',
    description: 'Working at top-tier companies with brand recognition'
  },
  {
    id: 'innovation',
    name: 'Innovation',
    emoji: '🚀',
    category: 'growth',
    description: 'Working on cutting-edge technology and new ideas'
  },
  {
    id: 'team_culture',
    name: 'Team Culture',
    emoji: '👥',
    category: 'lifestyle',
    description: 'Great colleagues and positive work environment'
  },
  {
    id: 'leadership',
    name: 'Leadership Opportunity',
    emoji: '👑',
    category: 'growth',
    description: 'Managing people and leading projects'
  }
];

export const VALUE_TRADEOFF_SCENARIOS: ValueTradeoffScenario[] = [
  {
    id: 'startup_vs_bigtech',
    title: 'Job Offer Decision',
    description: 'You have two offers on the table. Which do you choose?',
    optionA: {
      text: 'Series B Startup: €80K + 0.5% equity, 60hr weeks, huge impact on product direction, high uncertainty',
      values: { impact: 3, growth: 2, innovation: 3, autonomy: 2, compensation: 1, stability: -3, work_life_balance: -2 }
    },
    optionB: {
      text: 'FAANG Company: €140K, 40hr weeks, stable role, limited scope, great brand name, excellent benefits',
      values: { compensation: 3, stability: 3, work_life_balance: 2, prestige: 3, team_culture: 1, impact: -1, autonomy: -1 }
    }
  },
  {
    id: 'manager_vs_ic',
    title: 'Career Path Choice',
    description: 'Your company offers you two paths. Which do you take?',
    optionA: {
      text: 'Management Track: Lead a team of 8 engineers, no coding, high visibility, lots of meetings',
      values: { leadership: 4, prestige: 2, compensation: 2, autonomy: 1, innovation: -2 }
    },
    optionB: {
      text: 'Principal Engineer: Deep technical work, architect new systems, mentor informally, stay hands-on',
      values: { innovation: 3, growth: 3, autonomy: 2, impact: 2, leadership: 1 }
    }
  },
  {
    id: 'crunch_time',
    title: 'Launch Deadline',
    description: 'Your product launch is in 2 weeks but needs 4 weeks of work. What do you do?',
    optionA: {
      text: 'Work 80hr weeks to hit the deadline, cancel personal plans, deliver with some technical debt',
      values: { impact: 2, compensation: 1, work_life_balance: -3, stability: -1 }
    },
    optionB: {
      text: 'Push back the deadline, maintain work-life balance, deliver higher quality but later',
      values: { work_life_balance: 3, stability: 1, growth: 1, impact: -1 }
    }
  },
  {
    id: 'safe_vs_risky_project',
    title: 'Project Selection',
    description: 'You can choose which project to work on. Which sounds more appealing?',
    optionA: {
      text: 'Experimental ML Project: High risk of failure, cutting-edge tech, potential to revolutionize product',
      values: { innovation: 4, growth: 3, impact: 2, stability: -2 }
    },
    optionB: {
      text: 'Core Infrastructure: Proven technologies, clear path to success, critical but not exciting',
      values: { stability: 3, team_culture: 2, compensation: 1, innovation: -2 }
    }
  },
  {
    id: 'remote_vs_office',
    title: 'Work Location',
    description: 'Your company is changing policy. Which would you prefer?',
    optionA: {
      text: 'Fully Remote: Work from anywhere, save commute time, less face time with leadership',
      values: { work_life_balance: 3, autonomy: 3, prestige: -1, team_culture: -1 }
    },
    optionB: {
      text: 'Office-First: In-person collaboration, stronger networking, 2hr daily commute, more visibility',
      values: { team_culture: 3, prestige: 2, leadership: 2, work_life_balance: -2 }
    }
  },
  {
    id: 'salary_vs_equity',
    title: 'Compensation Structure',
    description: 'You can choose how to structure your compensation package.',
    optionA: {
      text: 'High Salary: €160K base, minimal equity, guaranteed income, lower upside',
      values: { compensation: 3, stability: 3, work_life_balance: 1, impact: -1 }
    },
    optionB: {
      text: 'Equity Heavy: €100K base, 1% equity, huge upside if company succeeds, more risk',
      values: { compensation: 1, impact: 2, innovation: 1, stability: -2 }
    }
  },
  {
    id: 'specialist_vs_generalist',
    title: 'Skill Development',
    description: 'How would you prefer to grow in your career?',
    optionA: {
      text: 'Deep Specialist: Become world-class expert in one domain (e.g., distributed systems)',
      values: { growth: 3, prestige: 2, innovation: 2, autonomy: 1 }
    },
    optionB: {
      text: 'T-Shaped Generalist: Broad skills across frontend, backend, DevOps, product',
      values: { growth: 2, autonomy: 3, leadership: 2, innovation: 1 }
    }
  },
  {
    id: 'nonprofit_vs_forprofit',
    title: 'Mission vs Money',
    description: 'Two very different opportunities. Which aligns with your values?',
    optionA: {
      text: 'Climate Tech Nonprofit: €70K, solving climate change, mission-driven team, limited resources',
      values: { impact: 4, team_culture: 3, work_life_balance: 2, compensation: -2, prestige: -1 }
    },
    optionB: {
      text: 'AdTech Unicorn: €180K + equity, optimizing ad targeting, huge budget, less fulfilling mission',
      values: { compensation: 4, prestige: 2, innovation: 1, stability: 2, impact: -3 }
    }
  },
  {
    id: 'founder_vs_employee',
    title: 'Risk Tolerance',
    description: 'Your cofounder invites you to quit and start a company together.',
    optionA: {
      text: 'Co-Found Startup: No salary for 12 months, 25% equity, total autonomy, 90% fail rate',
      values: { autonomy: 4, impact: 3, innovation: 3, leadership: 3, stability: -4, compensation: -2 }
    },
    optionB: {
      text: 'Stay at Current Job: Keep €120K salary, solid equity, interesting work, less control',
      values: { stability: 4, compensation: 3, work_life_balance: 2, team_culture: 2, autonomy: -2 }
    }
  },
  {
    id: 'small_team_large_impact',
    title: 'Team Size Preference',
    description: 'Which environment would you thrive in?',
    optionA: {
      text: 'Small Team (5 people): Wear many hats, high autonomy, broader impact, less structure',
      values: { autonomy: 3, impact: 3, growth: 2, innovation: 2, stability: -1 }
    },
    optionB: {
      text: 'Large Team (50 people): Specialized role, clear processes, great mentors, narrow scope',
      values: { stability: 3, team_culture: 3, growth: 2, prestige: 1, autonomy: -2 }
    }
  },
  {
    id: 'travel_required',
    title: 'Travel vs Roots',
    description: 'A promotion requires significant travel. How do you feel?',
    optionA: {
      text: 'Accept Role: 50% travel, meet clients worldwide, expense account, away from home',
      values: { prestige: 3, leadership: 2, compensation: 2, work_life_balance: -3 }
    },
    optionB: {
      text: 'Decline Role: Stay local, maintain routine, less exciting, better for personal life',
      values: { work_life_balance: 4, stability: 2, team_culture: 1, prestige: -2 }
    }
  },
  {
    id: 'mentor_vs_mentee',
    title: 'Learning Style',
    description: 'How do you want to spend your time at work?',
    optionA: {
      text: 'Mentoring Others: Teach juniors, code reviews, pair programming, slower personal growth',
      values: { leadership: 3, team_culture: 3, impact: 2, growth: -1 }
    },
    optionB: {
      text: 'Being Mentored: Learn from seniors, focus on your development, less team contribution',
      values: { growth: 4, innovation: 2, autonomy: 1, leadership: -2 }
    }
  },
  {
    id: 'legacy_vs_greenfield',
    title: 'Codebase Type',
    description: 'Which type of work excites you more?',
    optionA: {
      text: 'Legacy Modernization: Fix 10-year-old codebase, solve hard puzzles, less glamorous',
      values: { stability: 2, growth: 2, impact: 2, innovation: -2 }
    },
    optionB: {
      text: 'Greenfield Project: Build from scratch, choose tech stack, more uncertainty',
      values: { innovation: 4, autonomy: 3, growth: 2, stability: -2 }
    }
  },
  {
    id: 'public_vs_private',
    title: 'Company Stage',
    description: 'What company stage appeals to you most?',
    optionA: {
      text: 'Pre-IPO Private: High growth, equity worth TBD, more chaos, potential huge payout',
      values: { compensation: 2, innovation: 3, impact: 2, stability: -2, work_life_balance: -1 }
    },
    optionB: {
      text: 'Public Company: Stock is liquid, more process, slower pace, predictable career',
      values: { stability: 4, compensation: 2, work_life_balance: 2, prestige: 2, innovation: -2 }
    }
  },
  {
    id: 'customer_facing',
    title: 'User Interaction',
    description: 'How much do you want to interact with end users?',
    optionA: {
      text: 'Customer-Facing: Talk to users daily, understand pain points, less coding time',
      values: { impact: 3, team_culture: 2, growth: 1, autonomy: -1 }
    },
    optionB: {
      text: 'Backend Focus: Pure engineering, no user calls, optimize systems, less visibility',
      values: { innovation: 3, autonomy: 3, growth: 2, prestige: -1 }
    }
  },
  {
    id: 'fast_vs_quality',
    title: 'Pace of Work',
    description: 'What development pace suits you best?',
    optionA: {
      text: 'Move Fast: Ship daily, iterate quickly, accept bugs, aggressive deadlines',
      values: { innovation: 3, impact: 2, growth: 1, stability: -2, work_life_balance: -1 }
    },
    optionB: {
      text: 'Move Carefully: Thorough testing, code quality first, slower releases, less stress',
      values: { stability: 3, work_life_balance: 2, team_culture: 2, innovation: -2 }
    }
  },
  {
    id: 'single_vs_multi_product',
    title: 'Product Focus',
    description: 'What type of product work interests you?',
    optionA: {
      text: 'Single Product Depth: Own one product end-to-end, become domain expert, less variety',
      values: { impact: 3, autonomy: 2, growth: 1, innovation: -1 }
    },
    optionB: {
      text: 'Multi-Product Breadth: Jump between projects, variety, less ownership, broader learning',
      values: { growth: 3, innovation: 2, autonomy: 1, impact: -1 }
    }
  },
  {
    id: 'competitive_vs_collaborative',
    title: 'Team Culture Type',
    description: 'What team culture do you prefer?',
    optionA: {
      text: 'Competitive: Stack ranking, performance-driven, high performers rewarded, stressful',
      values: { compensation: 3, prestige: 2, growth: 1, team_culture: -2, work_life_balance: -2 }
    },
    optionB: {
      text: 'Collaborative: Team success valued, supportive, less individual glory, psychologically safe',
      values: { team_culture: 4, work_life_balance: 3, stability: 2, compensation: -1 }
    }
  },
  {
    id: 'documented_vs_tribal',
    title: 'Knowledge Sharing',
    description: 'What documentation culture do you prefer?',
    optionA: {
      text: 'Heavily Documented: Everything written down, slower, easier to onboard, less flexibility',
      values: { stability: 3, team_culture: 2, work_life_balance: 1, innovation: -1 }
    },
    optionB: {
      text: 'Tribal Knowledge: Learn by doing, ask people, faster iteration, harder for new joiners',
      values: { innovation: 2, autonomy: 2, growth: 1, stability: -2 }
    }
  },
  {
    id: 'recognized_vs_behind_scenes',
    title: 'Visibility Preference',
    description: 'How important is recognition to you?',
    optionA: {
      text: 'High Visibility: Present to executives, company-wide demos, credit for wins, more pressure',
      values: { prestige: 4, leadership: 3, compensation: 2, work_life_balance: -2 }
    },
    optionB: {
      text: 'Behind Scenes: Critical infra work, few know your impact, less stress, quiet contribution',
      values: { autonomy: 3, work_life_balance: 3, stability: 2, prestige: -3 }
    }
  }
];

export const VALUE_ARCHETYPES = {
  impact: { name: 'The Altruist', description: 'Mission-driven with focus on meaningful contribution' },
  growth: { name: 'The Builder', description: 'Continuous learner seeking personal development' },
  compensation: { name: 'The Careerist', description: 'Financially motivated with focus on earnings' },
  autonomy: { name: 'The Maverick', description: 'Independent operator who values freedom' },
  innovation: { name: 'The Innovator', description: 'Cutting-edge technology seeker' },
  stability: { name: 'The Pragmatist', description: 'Risk-averse professional valuing security' },
  work_life_balance: { name: 'The Harmonizer', description: 'Balanced approach to work and life' },
  prestige: { name: 'The Achiever', description: 'Status-driven and brand-conscious' },
  team_culture: { name: 'The Collaborator', description: 'Relationship-focused team player' },
  leadership: { name: 'The Leader', description: 'Natural manager and people developer' }
};
