/**
 * Code Cleanup Tracker
 * 
 * This file tracks TODOs and technical debt items that need to be addressed.
 * Convert inline TODOs to tracked issues here for better visibility and prioritization.
 */

export const technicalDebtItems = {
  highPriority: [
    {
      id: 'TD-001',
      file: 'src/services/adminCandidateService.ts',
      line: 170,
      description: 'Implement proper strategist fetching in getStrategists()',
      impact: 'Critical for admin workflow',
      estimatedEffort: '2h'
    },
    {
      id: 'TD-002',
      file: 'src/pages/ContractDetailPage.tsx',
      line: 115,
      description: 'Trigger payment release via edge function on milestone approval',
      impact: 'Blocks contract payments',
      estimatedEffort: '4h'
    }
  ],
  mediumPriority: [
    {
      id: 'TD-003',
      file: 'src/components/meetings/MeetingAnalyticsDashboard.tsx',
      line: 126,
      description: 'Calculate actual meeting durations from database',
      impact: 'Analytics accuracy',
      estimatedEffort: '1h'
    },
    {
      id: 'TD-004',
      file: 'src/hooks/useNextSteps.ts',
      line: 88,
      description: 'Fetch interview schedule count from interviews table',
      impact: 'User dashboard completeness',
      estimatedEffort: '30m'
    },
    {
      id: 'TD-005',
      file: 'src/hooks/useNextSteps.ts',
      line: 95,
      description: 'Fetch referrals count from referrals table',
      impact: 'User dashboard completeness',
      estimatedEffort: '30m'
    },
    {
      id: 'TD-006',
      file: 'src/hooks/useNextSteps.ts',
      line: 96,
      description: 'Check notification settings for configured status',
      impact: 'User onboarding flow',
      estimatedEffort: '1h'
    },
    {
      id: 'TD-007',
      file: 'src/pages/ContractSignaturePage.tsx',
      line: 57,
      description: 'Get real IP address for signature tracking',
      impact: 'Legal compliance',
      estimatedEffort: '2h'
    }
  ],
  lowPriority: [
    {
      id: 'TD-008',
      file: 'src/utils/analyticsExport.ts',
      line: 144,
      description: 'Implement email scheduling via Edge Function',
      impact: 'Nice-to-have feature',
      estimatedEffort: '3h'
    },
    {
      id: 'TD-009',
      file: 'src/components/partner/ExpandablePipelineStage.tsx',
      line: 142,
      description: 'Implement reschedule meeting dialog',
      impact: 'User convenience',
      estimatedEffort: '2h'
    },
    {
      id: 'TD-010',
      file: 'src/pages/assessments/Incubator20.tsx',
      line: 27,
      description: 'Fetch user profile for better scenario personalization',
      impact: 'Assessment quality',
      estimatedEffort: '1h'
    },
    {
      id: 'TD-011',
      file: 'src/pages/MeetingTemplates.tsx',
      line: 64,
      description: 'Fetch from actual meeting_templates table once schema updated',
      impact: 'Feature completion',
      estimatedEffort: '1h'
    },
    {
      id: 'TD-012',
      file: 'src/pages/MessagingAnalytics.tsx',
      line: 59,
      description: 'Calculate actual response time from message timestamps',
      impact: 'Analytics accuracy',
      estimatedEffort: '1h'
    },
    {
      id: 'TD-013',
      file: 'src/pages/ContractDetailPage.tsx',
      line: 122,
      description: 'Open modal for milestone revision feedback',
      impact: 'User workflow',
      estimatedEffort: '2h'
    },
    {
      id: 'TD-014',
      file: 'src/pages/ContractDetailPage.tsx',
      line: 127,
      description: 'Open file upload modal for deliverables',
      impact: 'User workflow',
      estimatedEffort: '2h'
    },
    {
      id: 'TD-015',
      file: 'src/pages/ContractDetailPage.tsx',
      line: 131,
      description: 'Open comments drawer for milestone discussions',
      impact: 'User collaboration',
      estimatedEffort: '2h'
    },
    {
      id: 'TD-016',
      file: 'src/hooks/useAlgorithmicFeed.ts',
      line: 176,
      description: 'Get share count from post_shares table',
      impact: 'Feed algorithm accuracy',
      estimatedEffort: '30m'
    }
  ]
};

/**
 * Utility to check if a feature is marked as technical debt
 */
export const isFeatureInProgress = (filePattern: string): boolean => {
  const allItems = [
    ...technicalDebtItems.highPriority,
    ...technicalDebtItems.mediumPriority,
    ...technicalDebtItems.lowPriority
  ];
  
  return allItems.some(item => item.file.includes(filePattern));
};

/**
 * Get technical debt summary
 */
export const getTechnicalDebtSummary = () => {
  const high = technicalDebtItems.highPriority.length;
  const medium = technicalDebtItems.mediumPriority.length;
  const low = technicalDebtItems.lowPriority.length;
  const total = high + medium + low;
  
  return {
    total,
    high,
    medium,
    low,
    estimatedHours: allItems.reduce((sum, item) => {
      const hours = parseFloat(item.estimatedEffort.replace(/[^0-9.]/g, ''));
      return sum + hours;
    }, 0)
  };
};

const allItems = [
  ...technicalDebtItems.highPriority,
  ...technicalDebtItems.mediumPriority,
  ...technicalDebtItems.lowPriority
];
