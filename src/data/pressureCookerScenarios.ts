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
        sender: 'Sarah Chen',
        senderRole: 'CEO',
        senderPersonality: 'impatient' as const,
        urgency: 'high' as const,
        impact: 'high' as const,
        estimatedTime: 10,
        arrivalTime: 0,
        dueIn: 30,
        blocks: ['task_5'], // Metrics needed for investor report
        emailThread: [
          {
            from: 'Sarah Chen',
            timestamp: '09:00 AM',
            message: 'Need the launch dashboard ready ASAP. Board wants numbers by noon.'
          },
          {
            from: 'Sarah Chen',
            timestamp: '09:15 AM',
            message: 'Following up - where are we on this?'
          }
        ],
        attachments: [
          {
            type: 'document' as const,
            name: 'Dashboard_Requirements.pdf',
            preview: '• Real-time user signups\n• Conversion funnel\n• Server health metrics'
          }
        ]
      },
      {
        id: 'task_2',
        type: 'bug' as const,
        title: 'Payment system not processing',
        description: 'Critical bug: 15% of transactions failing at checkout. Stripe webhook returning 500 errors.',
        sender: 'Marcus Rivera',
        senderRole: 'Lead Engineer',
        senderPersonality: 'detail-oriented' as const,
        urgency: 'critical' as const,
        impact: 'high' as const,
        estimatedTime: 20,
        arrivalTime: 60,
        isInterrupt: true, // Shows as blocking modal
        hiddenContext: 'Error logs show the issue started 10 minutes ago. Estimated revenue loss: $2,000/hour. We have a hotfix ready but need approval to deploy.',
        attachments: [
          {
            type: 'code' as const,
            name: 'error_logs.txt',
            preview: 'Error: Stripe API timeout\nStack trace: payment_processor.js:142\nAffected users: 156 in last 10 minutes'
          }
        ],
        parts: [
          { id: 'part_1', title: 'Review error logs', completed: false },
          { id: 'part_2', title: 'Approve hotfix deployment', completed: false },
          { id: 'part_3', title: 'Notify affected customers', completed: false }
        ],
        triggersEscalation: {
          taskId: 'task_2_escalation',
          delaySeconds: 180,
          condition: 'skip' as const
        }
      },
      {
        id: 'task_3',
        type: 'approval' as const,
        title: 'Marketing budget increase',
        description: 'Marketing team requesting 50% budget increase ($25K) for launch ads. Need decision within 2 hours to lock in ad slots.',
        sender: 'Emma Watson',
        senderRole: 'Marketing Lead',
        senderPersonality: 'collaborative' as const,
        urgency: 'medium' as const,
        impact: 'medium' as const,
        estimatedTime: 5,
        arrivalTime: 120,
        dependencies: ['task_1'], // Need metrics to justify budget
        attachments: [
          {
            type: 'spreadsheet' as const,
            name: 'Ad_Campaign_Projections.xlsx',
            preview: 'Projected reach: +40K users\nCost per acquisition: $12.50\nExpected ROI: 320%'
          }
        ]
      },
      {
        id: 'task_4',
        type: 'escalation' as const,
        title: 'Key customer threatening to cancel',
        description: 'Acme Corp (30% of MRR) unhappy with new pricing. CEO wants to speak with leadership today.',
        sender: 'Jordan Lee',
        senderRole: 'Customer Success Manager',
        senderPersonality: 'demanding' as const,
        urgency: 'high' as const,
        impact: 'high' as const,
        estimatedTime: 15,
        arrivalTime: 180,
        emailThread: [
          {
            from: 'Acme Corp CEO',
            timestamp: '08:30 AM',
            message: 'Price increase is unacceptable. We need to discuss alternatives or we\'re moving to competitor by Friday.'
          },
          {
            from: 'Jordan Lee',
            timestamp: '09:30 AM',
            message: 'This is escalating quickly. They\'re our largest customer. Can you jump on a call?'
          }
        ]
      },
      {
        id: 'task_5',
        type: 'report' as const,
        title: 'Investor update due today',
        description: 'Monthly investor report with financial metrics and KPIs. Board meeting at 2 PM.',
        sender: 'David Park',
        senderRole: 'CFO',
        senderPersonality: 'detail-oriented' as const,
        urgency: 'high' as const,
        impact: 'medium' as const,
        estimatedTime: 25,
        arrivalTime: 240,
        dueIn: 60,
        dependencies: ['task_1'], // Need launch metrics for report
        attachments: [
          {
            type: 'document' as const,
            name: 'Investor_Report_Template.docx',
            preview: 'Sections needed:\n• Launch performance\n• Revenue YTD\n• Burn rate\n• Customer acquisition'
          }
        ]
      },
      {
        id: 'task_6',
        type: 'meeting' as const,
        title: 'Emergency team sync',
        description: 'Engineering team requesting immediate meeting about infrastructure scaling. Servers at 85% capacity.',
        sender: 'Alex Thompson',
        senderRole: 'CTO',
        senderPersonality: 'collaborative' as const,
        urgency: 'high' as const,
        impact: 'high' as const,
        estimatedTime: 30,
        arrivalTime: 300,
        hiddenContext: 'Current growth rate means we\'ll hit capacity limits in 6 hours. Need to decide: scale vertically ($5K/month) or horizontally ($12K/month but more robust).',
        dependencies: ['task_2'] // Need payment system fixed before scaling
      },
      {
        id: 'task_7',
        type: 'email' as const,
        title: 'Press inquiry deadline',
        description: 'TechCrunch writing feature article. Need quotes and product details within 2 hours or they\'ll move on.',
        sender: 'Rachel Green',
        senderRole: 'PR Manager',
        senderPersonality: 'impatient' as const,
        urgency: 'high' as const,
        impact: 'medium' as const,
        estimatedTime: 15,
        arrivalTime: 360,
        emailThread: [
          {
            from: 'TechCrunch Editor',
            timestamp: '10:00 AM',
            message: 'We\'re featuring 5 launches today. Need your story by noon or we\'ll feature competitor instead.'
          }
        ]
      },
      {
        id: 'task_8',
        type: 'bug' as const,
        title: 'Mobile app crashing on iOS',
        description: '30% of iOS users experiencing crashes on app launch. App Store rating dropping rapidly.',
        sender: 'Lisa Chang',
        senderRole: 'QA Lead',
        senderPersonality: 'detail-oriented' as const,
        urgency: 'critical' as const,
        impact: 'high' as const,
        estimatedTime: 20,
        arrivalTime: 420,
        isInterrupt: true,
        attachments: [
          {
            type: 'chart' as const,
            name: 'Crash_Analytics.png',
            preview: 'Crash rate: 32%\nAffected devices: iPhone 14 Pro, 15 Pro\niOS version: 17.2+'
          }
        ]
      },
      // Escalation task triggered if task_2 is skipped
      {
        id: 'task_2_escalation',
        type: 'escalation' as const,
        title: 'CEO URGENT: Payment system down',
        description: 'CEO Sarah Chen: "Why wasn\'t I notified immediately? We\'re losing thousands per hour!"',
        sender: 'Sarah Chen',
        senderRole: 'CEO',
        senderPersonality: 'demanding' as const,
        urgency: 'critical' as const,
        impact: 'high' as const,
        estimatedTime: 10,
        arrivalTime: 999999, // Will be set dynamically
        isInterrupt: true
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
        description: 'Security team detected unusual database access patterns from unknown IP addresses',
        sender: 'Mike Johnson',
        senderRole: 'Security Lead',
        senderPersonality: 'detail-oriented' as const,
        urgency: 'critical' as const,
        impact: 'high' as const,
        estimatedTime: 30,
        arrivalTime: 0,
        isInterrupt: true,
        attachments: [
          {
            type: 'document' as const,
            name: 'Security_Alert.pdf',
            preview: '• Suspicious queries to user_data table\n• IP: 203.45.67.89 (Russia)\n• 15,000 records accessed\n• Occurred: 3:42 AM - 4:18 AM'
          }
        ]
      },
      {
        id: 'task_2',
        type: 'approval' as const,
        title: 'Emergency contractor hire',
        description: 'Need approval to hire security consultant at 3x normal rate ($15K for 48h)',
        sender: 'Jessica Brown',
        senderRole: 'HR Director',
        senderPersonality: 'collaborative' as const,
        urgency: 'high' as const,
        impact: 'medium' as const,
        estimatedTime: 5,
        arrivalTime: 120,
        dependencies: ['task_1']
      },
      {
        id: 'task_3',
        type: 'email' as const,
        title: 'Legal team needs incident details',
        description: 'Legal requesting full timeline and scope of security incident for potential disclosure requirements',
        sender: 'Robert Kim',
        senderRole: 'Legal Counsel',
        senderPersonality: 'detail-oriented' as const,
        urgency: 'high' as const,
        impact: 'high' as const,
        estimatedTime: 20,
        arrivalTime: 180,
        dependencies: ['task_1']
      },
      {
        id: 'task_4',
        type: 'meeting' as const,
        title: 'Board emergency call',
        description: 'Board of directors requesting immediate briefing on incident',
        sender: 'Patricia Davis',
        senderRole: 'Board Chair',
        senderPersonality: 'demanding' as const,
        urgency: 'critical' as const,
        impact: 'high' as const,
        estimatedTime: 45,
        arrivalTime: 240,
        isInterrupt: true
      },
      {
        id: 'task_5',
        type: 'report' as const,
        title: 'Customer communication plan',
        description: 'Draft email to affected customers about potential breach',
        sender: 'Nicole Martinez',
        senderRole: 'Communications Director',
        senderPersonality: 'collaborative' as const,
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
        sender: 'Mike Johnson',
        senderRole: 'Security Lead',
        senderPersonality: 'detail-oriented' as const,
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
