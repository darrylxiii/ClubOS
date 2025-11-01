import { IncubatorScenario } from '@/types/assessment';

export const INCUBATOR_SCENARIOS: IncubatorScenario[] = [
  // Fintech
  {
    id: 'fintech-1',
    industry: 'Fintech',
    customer: 'SMB restaurants',
    constraint: 'no paid ads for first 90 days',
    budget: 50000,
    stage: 'Prototype',
    region: 'US',
    twist: 'Stripe increases fees 20%',
    difficulty: 1.0,
    title: 'AI-assisted bookkeeping for SMB restaurants in the US',
  },
  {
    id: 'fintech-2',
    industry: 'Fintech',
    customer: 'Freelancers',
    constraint: 'data privacy limits PII storage',
    budget: 250000,
    stage: 'Pilot',
    region: 'EU',
    twist: 'competitor just raised $50M',
    difficulty: 1.3,
    title: 'Instant credit line for freelance workers',
  },
  {
    id: 'fintech-3',
    industry: 'Fintech',
    customer: 'Mid-market B2B',
    constraint: 'no direct sales team first 6 months',
    budget: 1000000,
    stage: 'Early Revenue',
    region: 'US',
    twist: 'API pricing suddenly 3× higher',
    difficulty: 1.5,
    title: 'Treasury management for mid-market companies',
  },
  // B2B SaaS
  {
    id: 'saas-1',
    industry: 'B2B SaaS',
    customer: 'DevOps teams',
    constraint: 'must integrate with 3+ CI/CD platforms',
    budget: 100000,
    stage: 'Prototype',
    region: 'US',
    twist: 'major platform deprecated API',
    difficulty: 1.2,
    title: 'CI/CD cost optimizer for engineering teams',
  },
  {
    id: 'saas-2',
    industry: 'B2B SaaS',
    customer: 'Enterprise compliance',
    constraint: 'on-premise deployment required',
    budget: 500000,
    stage: 'Pilot',
    region: 'EU',
    twist: 'new GDPR ruling affects data retention',
    difficulty: 1.6,
    title: 'AI code review for regulatory compliance',
  },
  // Healthcare
  {
    id: 'health-1',
    industry: 'Healthcare',
    customer: 'Medical billing offices',
    constraint: 'HIPAA compliance required, no AI on PHI',
    budget: 150000,
    stage: 'Pilot',
    region: 'US',
    twist: 'insurance reimbursement rates cut 15%',
    difficulty: 1.4,
    title: 'Prior authorization automation platform',
  },
  {
    id: 'health-2',
    industry: 'Healthcare',
    customer: 'Physical therapy clinics',
    constraint: 'hardware lead time 10 weeks',
    budget: 75000,
    stage: 'Research',
    region: 'US',
    twist: 'seasonal demand spike expected',
    difficulty: 1.1,
    title: 'Remote PT adherence monitoring system',
  },
  // Climate
  {
    id: 'climate-1',
    industry: 'Climate',
    customer: 'Mid-market manufacturers',
    constraint: 'no paid channels for 90 days',
    budget: 250000,
    stage: 'Pilot',
    region: 'EU',
    twist: 'competitor just raised $50M',
    difficulty: 1.3,
    title: 'Energy usage forecasting for factories',
  },
  {
    id: 'climate-2',
    industry: 'Climate',
    customer: 'Cold chain logistics SMBs',
    constraint: 'IoT hardware cost must be <$100/unit',
    budget: 100000,
    stage: 'Prototype',
    region: 'US',
    twist: 'supply chain delays on sensors',
    difficulty: 1.2,
    title: 'Cold chain monitoring and optimization',
  },
  // Creator Economy
  {
    id: 'creator-1',
    industry: 'Creator',
    customer: 'Mid-tier content creators',
    constraint: 'commission-only revenue first 6 months',
    budget: 50000,
    stage: 'Research',
    region: 'US',
    twist: 'platform algorithm change reduces reach',
    difficulty: 1.0,
    title: 'UGC licensing marketplace',
  },
  {
    id: 'creator-2',
    industry: 'Creator',
    customer: 'Live shopping hosts',
    constraint: 'real-time latency must be <500ms',
    budget: 200000,
    stage: 'Pilot',
    region: 'SEA',
    twist: 'major platform launches competing feature',
    difficulty: 1.4,
    title: 'Live shopping analytics and engagement tools',
  },
  // DevTools
  {
    id: 'devtools-1',
    industry: 'DevTools',
    customer: 'Startup engineering teams',
    constraint: 'freemium model required',
    budget: 150000,
    stage: 'Early Revenue',
    region: 'US',
    twist: 'major competitor acquired by BigTech',
    difficulty: 1.3,
    title: 'Feature flag analytics and optimization',
  },
  // AI Infrastructure
  {
    id: 'ai-1',
    industry: 'AI Infra',
    customer: 'ML teams at growth companies',
    constraint: 'must support air-gapped deployments',
    budget: 500000,
    stage: 'Pilot',
    region: 'US',
    twist: 'GPU costs increase 40%',
    difficulty: 1.5,
    title: 'Model serving cost optimization platform',
  },
  // Marketplaces
  {
    id: 'marketplace-1',
    industry: 'Marketplaces',
    customer: 'Micro-brands and DTC sellers',
    constraint: 'take rate limited to 10%',
    budget: 200000,
    stage: 'Prototype',
    region: 'US',
    twist: 'payment processor increases fees',
    difficulty: 1.2,
    title: 'Quality assurance network for dropshipping',
  },
];

export const REQUIRED_SECTIONS = [
  {
    id: 'problem',
    title: 'Problem & ICP',
    wordCap: 60,
    description: 'Who, urgent pain, why now',
  },
  {
    id: 'solution',
    title: 'Solution & Wedge',
    wordCap: 80,
    description: 'Smallest shippable wedge that earns trust',
  },
  {
    id: 'gtm',
    title: 'GTM Plan',
    wordCap: 100,
    description: 'Channels, motion (PLG vs. sales), first 100 users',
  },
  {
    id: 'unitEconomics',
    title: 'Unit Economics',
    wordCap: 100,
    description: 'Price, COGS, gross margin, payback math',
  },
  {
    id: 'executionPlan',
    title: '12-Week Plan & Budget',
    wordCap: 80,
    description: 'Milestones, hiring/contractors, line items',
  },
  {
    id: 'risks',
    title: 'Risks & Tests',
    wordCap: 30,
    description: 'Top 2 risks + 1 falsification test each',
  },
];

export function generatePersonalizedScenario(userProfile?: any): IncubatorScenario {
  // Filter scenarios based on user experience
  let availableScenarios = [...INCUBATOR_SCENARIOS];
  
  // Adjust difficulty based on profile
  if (userProfile?.current_title?.includes('Senior') || userProfile?.applications?.length > 10) {
    availableScenarios = availableScenarios.filter(s => s.difficulty >= 1.2);
  } else if (userProfile?.applications?.length < 5) {
    availableScenarios = availableScenarios.filter(s => s.difficulty <= 1.3);
  }
  
  // Avoid industries where user has heavy experience
  if (userProfile?.applications) {
    const industryExperience = userProfile.applications.reduce((acc: any, app: any) => {
      acc[app.industry] = (acc[app.industry] || 0) + 1;
      return acc;
    }, {});
    
    // If user has >5 applications in an industry, give them harder scenarios in that industry
    // or avoid it to test versatility
    const dominantIndustry = Object.keys(industryExperience).find(
      (industry) => industryExperience[industry] > 5
    );
    
    if (dominantIndustry) {
      availableScenarios = availableScenarios.filter(
        s => s.industry !== dominantIndustry || s.difficulty >= 1.4
      );
    }
  }
  
  // Random selection from filtered pool
  const randomIndex = Math.floor(Math.random() * availableScenarios.length);
  return availableScenarios[randomIndex];
}
