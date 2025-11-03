import { PressureCookerTask } from '@/types/assessment';

export const PRESSURE_COOKER_SCENARIOS = {
  product_launch: {
    name: 'Product Launch Day',
    description: 'Critical product launch with multiple competing priorities',
    tasks: [
      {
        id: 'task_1',
        type: 'email' as const,
        title: 'CEO wants launch metrics',
        description: 'CEO requesting real-time dashboard access and preliminary user numbers',
        sender: 'CEO',
        urgency: 'high' as const,
        impact: 'high' as const,
        estimatedTime: 10,
        arrivalTime: 0,
        dueIn: 30
      },
      {
        id: 'task_2',
        type: 'bug' as const,
        title: 'Payment system not processing',
        description: 'Critical bug: 15% of transactions failing at checkout',
        sender: 'Engineering',
        urgency: 'critical' as const,
        impact: 'high' as const,
        estimatedTime: 20,
        arrivalTime: 60
      },
      {
        id: 'task_3',
        type: 'approval' as const,
        title: 'Marketing budget increase',
        description: 'Marketing team requesting 50% budget increase for launch ads',
        sender: 'Marketing Lead',
        urgency: 'medium' as const,
        impact: 'medium' as const,
        estimatedTime: 5,
        arrivalTime: 120
      },
      {
        id: 'task_4',
        type: 'escalation' as const,
        title: 'Key customer threatening to cancel',
        description: 'Enterprise customer unhappy with new pricing, considering churn',
        sender: 'Customer Success',
        urgency: 'high' as const,
        impact: 'high' as const,
        estimatedTime: 15,
        arrivalTime: 180
      },
      {
        id: 'task_5',
        type: 'report' as const,
        title: 'Investor update due today',
        description: 'Monthly investor report with financial metrics and KPIs',
        sender: 'CFO',
        urgency: 'high' as const,
        impact: 'medium' as const,
        estimatedTime: 25,
        arrivalTime: 240,
        dueIn: 60
      },
      {
        id: 'task_6',
        type: 'meeting' as const,
        title: 'Emergency team sync',
        description: 'Engineering team requesting immediate meeting about infrastructure scaling',
        sender: 'CTO',
        urgency: 'high' as const,
        impact: 'high' as const,
        estimatedTime: 30,
        arrivalTime: 300
      },
      {
        id: 'task_7',
        type: 'email' as const,
        title: 'Press inquiry deadline',
        description: 'TechCrunch needs quotes and product details within 2 hours',
        sender: 'PR Team',
        urgency: 'high' as const,
        impact: 'medium' as const,
        estimatedTime: 15,
        arrivalTime: 360
      },
      {
        id: 'task_8',
        type: 'bug' as const,
        title: 'Mobile app crashing on iOS',
        description: '30% of iOS users experiencing crashes on app launch',
        sender: 'QA Team',
        urgency: 'critical' as const,
        impact: 'high' as const,
        estimatedTime: 20,
        arrivalTime: 420
      }
    ] as PressureCookerTask[]
  },
  crisis_mode: {
    name: 'Security Incident Response',
    description: 'Active security incident requiring immediate attention',
    tasks: [
      {
        id: 'task_1',
        type: 'escalation' as const,
        title: 'Potential data breach detected',
        description: 'Security team detected unusual database access patterns',
        sender: 'Security Team',
        urgency: 'critical' as const,
        impact: 'high' as const,
        estimatedTime: 30,
        arrivalTime: 0
      },
      {
        id: 'task_2',
        type: 'approval' as const,
        title: 'Emergency contractor hire',
        description: 'Need approval to hire security consultant at 3x normal rate',
        sender: 'HR',
        urgency: 'high' as const,
        impact: 'medium' as const,
        estimatedTime: 5,
        arrivalTime: 120
      },
      {
        id: 'task_3',
        type: 'email' as const,
        title: 'Legal team needs incident details',
        description: 'Legal requesting full timeline and scope of security incident',
        sender: 'Legal Counsel',
        urgency: 'high' as const,
        impact: 'high' as const,
        estimatedTime: 20,
        arrivalTime: 180
      },
      {
        id: 'task_4',
        type: 'meeting' as const,
        title: 'Board emergency call',
        description: 'Board of directors requesting immediate briefing on incident',
        sender: 'Board Chair',
        urgency: 'critical' as const,
        impact: 'high' as const,
        estimatedTime: 45,
        arrivalTime: 240
      },
      {
        id: 'task_5',
        type: 'report' as const,
        title: 'Customer communication plan',
        description: 'Draft email to affected customers about potential breach',
        sender: 'Comms Team',
        urgency: 'high' as const,
        impact: 'high' as const,
        estimatedTime: 25,
        arrivalTime: 300
      },
      {
        id: 'task_6',
        type: 'bug' as const,
        title: 'Close security vulnerability',
        description: 'Patch critical security hole that may have been exploited',
        sender: 'Engineering',
        urgency: 'critical' as const,
        impact: 'high' as const,
        estimatedTime: 40,
        arrivalTime: 360
      }
    ] as PressureCookerTask[]
  }
};

export const OPTIMAL_TASK_ORDER = (tasks: PressureCookerTask[]): PressureCookerTask[] => {
  const urgencyScore = { critical: 4, high: 3, medium: 2, low: 1 };
  const impactScore = { high: 3, medium: 2, low: 1 };
  
  return [...tasks].sort((a, b) => {
    const aScore = (urgencyScore[a.urgency] * 3) + (impactScore[a.impact] * 2) - (a.estimatedTime * 0.05);
    const bScore = (urgencyScore[b.urgency] * 3) + (impactScore[b.impact] * 2) - (b.estimatedTime * 0.05);
    return bScore - aScore;
  });
};
