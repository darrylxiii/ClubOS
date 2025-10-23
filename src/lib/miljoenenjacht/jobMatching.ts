import { PsychologicalProfile, JobMatch } from '@/types/miljoenenjacht';

interface JobProfile {
  title: string;
  requiredTraits: { [key: string]: { min?: number; max?: number; weight: number } };
  preferredTraits?: { [key: string]: { min: number; weight: number } };
  disqualifiers?: { [key: string]: { min?: number; max?: number } };
}

const JOB_PROFILES: JobProfile[] = [
  {
    title: 'Financial Analyst',
    requiredTraits: {
      riskTolerance: { min: 40, max: 70, weight: 0.9 },
      analyticalThinking: { min: 75, weight: 1.0 },
      decisionQuality: { min: 70, weight: 0.9 },
      emotionalRegulation: { min: 60, weight: 0.7 }
    },
    disqualifiers: {
      riskTolerance: { max: 85 },
      emotionalRegulation: { min: 40 }
    }
  },
  {
    title: 'Sales Manager',
    requiredTraits: {
      riskTolerance: { min: 60, weight: 0.8 },
      pressurePerformance: { min: 70, weight: 1.0 },
      emotionalRegulation: { min: 65, weight: 0.8 }
    }
  },
  {
    title: 'Day Trader',
    requiredTraits: {
      riskTolerance: { min: 75, weight: 1.0 },
      decisionQuality: { min: 80, weight: 1.0 },
      pressurePerformance: { min: 85, weight: 1.0 },
      emotionalRegulation: { min: 75, weight: 0.9 }
    }
  },
  {
    title: 'Project Manager',
    requiredTraits: {
      riskTolerance: { min: 45, max: 70, weight: 0.7 },
      strategicPlanning: { min: 70, weight: 0.9 },
      decisionQuality: { min: 65, weight: 0.8 }
    }
  },
  {
    title: 'Startup Founder',
    requiredTraits: {
      riskTolerance: { min: 80, weight: 1.0 },
      pressurePerformance: { min: 75, weight: 0.9 },
      strategicPlanning: { min: 70, weight: 0.8 }
    }
  },
  {
    title: 'Accountant',
    requiredTraits: {
      riskTolerance: { max: 50, weight: 0.9 },
      decisionQuality: { min: 75, weight: 1.0 },
      analyticalThinking: { min: 70, weight: 0.8 }
    },
    disqualifiers: {
      riskTolerance: { min: 70 }
    }
  },
  {
    title: 'Investment Banker',
    requiredTraits: {
      riskTolerance: { min: 70, weight: 0.9 },
      pressurePerformance: { min: 80, weight: 1.0 },
      analyticalThinking: { min: 75, weight: 0.9 }
    }
  },
  {
    title: 'Risk Manager',
    requiredTraits: {
      riskTolerance: { min: 40, max: 65, weight: 0.9 },
      analyticalThinking: { min: 80, weight: 1.0 },
      strategicPlanning: { min: 75, weight: 0.9 }
    }
  },
  {
    title: 'Corporate Strategist',
    requiredTraits: {
      strategicPlanning: { min: 80, weight: 1.0 },
      analyticalThinking: { min: 75, weight: 0.9 },
      decisionQuality: { min: 75, weight: 0.8 }
    }
  },
  {
    title: 'Venture Capitalist',
    requiredTraits: {
      riskTolerance: { min: 75, weight: 1.0 },
      analyticalThinking: { min: 80, weight: 0.9 },
      strategicPlanning: { min: 75, weight: 0.8 }
    }
  }
];

export function calculateJobMatches(profile: PsychologicalProfile): JobMatch[] {
  const matches = JOB_PROFILES.map(job => ({
    ...calculateJobMatch(profile, job),
    title: job.title
  }));
  
  return matches
    .filter(m => !m.disqualified && m.matchScore >= 60)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);
}

function calculateJobMatch(
  profile: PsychologicalProfile,
  job: JobProfile
): Omit<JobMatch, 'title'> & { disqualified: boolean } {
  // Check disqualifiers
  if (job.disqualifiers) {
    for (const [trait, criteria] of Object.entries(job.disqualifiers)) {
      const value = getTraitValue(profile, trait);
      if (criteria.min !== undefined && value < criteria.min) {
        return { matchScore: 0, strengths: [], concerns: [], disqualified: true };
      }
      if (criteria.max !== undefined && value > criteria.max) {
        return { matchScore: 0, strengths: [], concerns: [], disqualified: true };
      }
    }
  }
  
  let totalScore = 0;
  let totalWeight = 0;
  const strengths: string[] = [];
  const concerns: string[] = [];
  
  // Score required traits
  for (const [trait, criteria] of Object.entries(job.requiredTraits)) {
    const value = getTraitValue(profile, trait);
    const weight = criteria.weight;
    let traitScore = 0;
    
    if (criteria.min !== undefined && criteria.max !== undefined) {
      if (value >= criteria.min && value <= criteria.max) {
        traitScore = 100;
        strengths.push(formatTraitName(trait));
      } else if (value < criteria.min) {
        traitScore = (value / criteria.min) * 100;
        concerns.push(`${formatTraitName(trait)} could be stronger`);
      } else {
        traitScore = (criteria.max / value) * 100;
        concerns.push(`${formatTraitName(trait)} may be too high`);
      }
    } else if (criteria.min !== undefined) {
      if (value >= criteria.min) {
        traitScore = Math.min(100, (value / criteria.min) * 100);
        if (value >= criteria.min * 1.2) {
          strengths.push(`Exceptional ${formatTraitName(trait)}`);
        }
      } else {
        traitScore = (value / criteria.min) * 100;
        concerns.push(`${formatTraitName(trait)} below optimal`);
      }
    } else if (criteria.max !== undefined) {
      if (value <= criteria.max) {
        traitScore = 100;
        strengths.push(formatTraitName(trait));
      } else {
        traitScore = (criteria.max / value) * 100;
        concerns.push(`${formatTraitName(trait)} exceeds ideal range`);
      }
    }
    
    totalScore += traitScore * weight;
    totalWeight += weight;
  }
  
  // Bonus for preferred traits
  if (job.preferredTraits) {
    for (const [trait, criteria] of Object.entries(job.preferredTraits)) {
      const value = getTraitValue(profile, trait);
      if (value >= criteria.min) {
        totalScore += 10 * criteria.weight;
        totalWeight += criteria.weight * 0.5;
        strengths.push(`Strong ${formatTraitName(trait)}`);
      }
    }
  }
  
  const finalScore = Math.round(totalScore / totalWeight);
  
  return {
    matchScore: finalScore,
    strengths: strengths.slice(0, 3),
    concerns: concerns.slice(0, 2),
    disqualified: false
  };
}

function getTraitValue(profile: PsychologicalProfile, trait: string): number {
  switch (trait) {
    case 'riskTolerance': return profile.riskTolerance;
    case 'decisionQuality': return profile.decisionQuality;
    case 'emotionalRegulation': return profile.emotionalRegulation;
    case 'pressurePerformance': return profile.pressurePerformance;
    case 'analyticalThinking': return profile.analyticalThinking;
    case 'strategicPlanning': return profile.strategicPlanning;
    case 'regretManagement': return profile.regretManagement;
    default: return 50;
  }
}

function formatTraitName(trait: string): string {
  return trait
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
