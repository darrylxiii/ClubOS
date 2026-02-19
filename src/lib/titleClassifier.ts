/**
 * Rule-based job title classifier for department and seniority inference.
 * Handles ~80% of titles without AI. Ambiguous titles return null for AI fallback.
 */

export interface TitleClassification {
  department: string | null;
  seniority: string | null;
  isDecisionMaker: boolean;
  method: 'rule_based' | 'ai_inferred';
}

// Department patterns — order matters (more specific first)
const DEPARTMENT_RULES: Array<{ pattern: RegExp; department: string }> = [
  // C-Suite (check before generic patterns)
  { pattern: /\b(ceo|chief executive)\b/i, department: 'Executive' },
  { pattern: /\b(cto|chief technology|chief technical)\b/i, department: 'Engineering' },
  { pattern: /\b(cfo|chief financial)\b/i, department: 'Finance' },
  { pattern: /\b(coo|chief operating)\b/i, department: 'Operations' },
  { pattern: /\b(cpo|chief product)\b/i, department: 'Product' },
  { pattern: /\b(cmo|chief marketing)\b/i, department: 'Marketing' },
  { pattern: /\b(cro|chief revenue)\b/i, department: 'Sales' },
  { pattern: /\b(chro|chief human|chief people)\b/i, department: 'People & HR' },
  { pattern: /\b(ciso|chief information security)\b/i, department: 'Security' },
  { pattern: /\b(cio|chief information officer)\b/i, department: 'IT' },
  { pattern: /\b(general counsel|chief legal)\b/i, department: 'Legal' },

  // Engineering & Technology
  { pattern: /\b(software|engineer|developer|sre|devops|backend|frontend|fullstack|full-stack|full stack|swe)\b/i, department: 'Engineering' },
  { pattern: /\b(architect|platform|infrastructure|cloud)\b/i, department: 'Engineering' },
  { pattern: /\b(qa|quality assurance|test engineer|sdet|automation engineer)\b/i, department: 'Engineering' },
  { pattern: /\b(mobile|ios|android|react native|flutter)\b/i, department: 'Engineering' },
  { pattern: /\b(machine learning|ml engineer|ai engineer|deep learning)\b/i, department: 'Engineering' },
  { pattern: /\b(security engineer|appsec|infosec)\b/i, department: 'Security' },

  // Data
  { pattern: /\b(data scientist|data analyst|data engineer|analytics engineer|bi analyst|business intelligence)\b/i, department: 'Data & Analytics' },

  // Product
  { pattern: /\b(product manager|product owner|product lead|product director|product design)\b/i, department: 'Product' },
  { pattern: /\b(program manager|technical program)\b/i, department: 'Product' },

  // Design
  { pattern: /\b(designer|ux|ui|user experience|user interface|graphic design|visual design|brand design)\b/i, department: 'Design' },
  { pattern: /\b(creative director|art director)\b/i, department: 'Design' },

  // Sales & Business Development
  { pattern: /\b(sales|account executive|ae\b|bdr|sdr|business development|revenue|deals|quota)\b/i, department: 'Sales' },
  { pattern: /\b(pre-?sales|solution engineer|sales engineer|solution architect)\b/i, department: 'Sales' },
  { pattern: /\b(partnerships|alliances|channel)\b/i, department: 'Business Development' },

  // Marketing
  { pattern: /\b(marketing|brand|content|growth|seo|sem|demand gen|digital marketing|pr\b|public relations|communications)\b/i, department: 'Marketing' },
  { pattern: /\b(social media|community manager|copywriter|editor)\b/i, department: 'Marketing' },
  { pattern: /\b(product marketing|pmm)\b/i, department: 'Marketing' },

  // Customer Success & Support
  { pattern: /\b(customer success|csm|client success|account manager|customer experience)\b/i, department: 'Customer Success' },
  { pattern: /\b(support engineer|technical support|help desk|customer support|customer service)\b/i, department: 'Support' },
  { pattern: /\b(implementation|onboarding specialist|solutions consultant)\b/i, department: 'Customer Success' },

  // People & HR
  { pattern: /\b(human resources|hr\b|people|talent acquisition|recruiter|recruiting|recruitment|employer brand)\b/i, department: 'People & HR' },
  { pattern: /\b(compensation|benefits|payroll|hris|people ops|people operations)\b/i, department: 'People & HR' },
  { pattern: /\b(learning|l&d|training|organizational development)\b/i, department: 'People & HR' },

  // Finance & Accounting
  { pattern: /\b(finance|financial|accountant|accounting|controller|treasury|tax|audit|fp&a|financial planning)\b/i, department: 'Finance' },
  { pattern: /\b(investor relations|fundraising)\b/i, department: 'Finance' },

  // Legal & Compliance
  { pattern: /\b(legal|lawyer|attorney|counsel|paralegal|compliance|regulatory|privacy officer|dpo)\b/i, department: 'Legal' },

  // Operations
  { pattern: /\b(operations|ops\b|supply chain|logistics|procurement|facilities|office manager|workplace)\b/i, department: 'Operations' },
  { pattern: /\b(project manager|project management|scrum master|agile coach|delivery manager)\b/i, department: 'Operations' },

  // IT & Infrastructure
  { pattern: /\b(it\b|information technology|system admin|sysadmin|network|helpdesk|desktop support|it support)\b/i, department: 'IT' },

  // Research
  { pattern: /\b(research|r&d|scientist|researcher|research engineer)\b/i, department: 'Research' },

  // Founders
  { pattern: /\b(founder|co-?founder)\b/i, department: 'Executive' },
];

// Seniority patterns — ordered from highest to lowest
const SENIORITY_RULES: Array<{ pattern: RegExp; level: string; isDecisionMaker: boolean }> = [
  // C-Suite
  { pattern: /\b(ceo|cto|cfo|coo|cpo|cmo|cro|chro|ciso|cio|chief)\b/i, level: 'C-Suite', isDecisionMaker: true },
  { pattern: /\b(founder|co-?founder)\b/i, level: 'C-Suite', isDecisionMaker: true },
  { pattern: /\b(president|managing director)\b/i, level: 'C-Suite', isDecisionMaker: true },
  { pattern: /\b(general manager|gm\b|general counsel)\b/i, level: 'C-Suite', isDecisionMaker: true },

  // VP
  { pattern: /\b(vp\b|vice president|svp|evp|avp)\b/i, level: 'VP', isDecisionMaker: true },

  // Director
  { pattern: /\b(director|head of)\b/i, level: 'Director', isDecisionMaker: true },

  // Senior Manager
  { pattern: /\b(senior manager|sr\.?\s*manager|group manager)\b/i, level: 'Senior Manager', isDecisionMaker: true },

  // Manager
  { pattern: /\b(manager|team lead|tech lead|engineering lead|lead\b)\b/i, level: 'Manager', isDecisionMaker: false },

  // Principal / Staff
  { pattern: /\b(principal|staff|distinguished|fellow)\b/i, level: 'Principal/Staff', isDecisionMaker: false },

  // Senior
  { pattern: /\b(senior|sr\.?|ii\b|iii\b|lead)\b/i, level: 'Senior IC', isDecisionMaker: false },

  // Mid-level (catch titles with no seniority indicator)
  { pattern: /\b(specialist|analyst|consultant|coordinator|associate)\b/i, level: 'IC', isDecisionMaker: false },

  // Junior / Entry
  { pattern: /\b(junior|jr\.?|intern|trainee|apprentice|entry|graduate)\b/i, level: 'Junior', isDecisionMaker: false },
];

/**
 * Classify a job title into department and seniority using rule-based matching.
 * Returns null for department/seniority if no rule matches (needs AI fallback).
 */
export function classifyTitle(title: string | null | undefined): TitleClassification {
  if (!title || title.trim().length === 0) {
    return { department: null, seniority: null, isDecisionMaker: false, method: 'rule_based' };
  }

  const normalizedTitle = title.trim();

  // Find department
  let department: string | null = null;
  for (const rule of DEPARTMENT_RULES) {
    if (rule.pattern.test(normalizedTitle)) {
      department = rule.department;
      break;
    }
  }

  // Find seniority
  let seniority: string | null = null;
  let isDecisionMaker = false;
  for (const rule of SENIORITY_RULES) {
    if (rule.pattern.test(normalizedTitle)) {
      seniority = rule.level;
      isDecisionMaker = rule.isDecisionMaker;
      break;
    }
  }

  // Default seniority to IC if we found a department but no seniority
  if (department && !seniority) {
    seniority = 'IC';
  }

  return {
    department,
    seniority,
    isDecisionMaker,
    method: 'rule_based',
  };
}

/**
 * Batch classify multiple titles. Returns classifications plus a list
 * of unclassified titles (those needing AI fallback).
 */
export function batchClassifyTitles(
  titles: Array<{ id: string; title: string | null }>
): {
  classified: Array<{ id: string; classification: TitleClassification }>;
  unclassified: Array<{ id: string; title: string }>;
} {
  const classified: Array<{ id: string; classification: TitleClassification }> = [];
  const unclassified: Array<{ id: string; title: string }> = [];

  for (const item of titles) {
    const result = classifyTitle(item.title);

    if (result.department) {
      classified.push({ id: item.id, classification: result });
    } else if (item.title) {
      // Department unknown — needs AI
      unclassified.push({ id: item.id, title: item.title });
      // Still store partial seniority if detected
      classified.push({ id: item.id, classification: result });
    }
  }

  return { classified, unclassified };
}

/**
 * All recognized departments for UI display / filtering
 */
export const RECOGNIZED_DEPARTMENTS = [
  'Executive',
  'Engineering',
  'Product',
  'Design',
  'Data & Analytics',
  'Sales',
  'Business Development',
  'Marketing',
  'Customer Success',
  'Support',
  'People & HR',
  'Finance',
  'Legal',
  'Operations',
  'IT',
  'Security',
  'Research',
] as const;

export const SENIORITY_ORDER = [
  'C-Suite',
  'VP',
  'Director',
  'Senior Manager',
  'Manager',
  'Principal/Staff',
  'Senior IC',
  'IC',
  'Junior',
] as const;
