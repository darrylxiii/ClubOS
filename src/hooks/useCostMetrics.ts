import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CostMetric {
  id: string;
  category: string;
  name: string;
  displayName: string;
  estimatedCost: number;
  usageCount: number;
  unit: string;
  costPerUnit: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export interface CronJobCost {
  name: string;
  schedule: string;
  estimatedDailyCost: number;
  executionsPerDay: number;
  lastExecution?: string;
  status: 'active' | 'paused';
  costDriver: string;
}

export interface StorageMetric {
  bucketName: string;
  sizeBytes: number;
  fileCount: number;
  estimatedMonthlyCost: number;
}

export interface CostSummary {
  dailyEstimate: number;
  weeklyEstimate: number;
  monthlyEstimate: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  breakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}

export interface BudgetAlert {
  id: string;
  type: 'warning' | 'critical';
  message: string;
  category: string;
  currentSpend: number;
  budgetLimit: number;
  percentageUsed: number;
}

// Calculate cron executions per day from schedule
function calculateDailyExecutions(schedule: string): number {
  // Parse cron schedule (simplified)
  const parts = schedule.split(' ');
  if (parts.length !== 5) return 1;
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  // Every minute
  if (minute === '*' && hour === '*') return 1440;
  // Every N minutes
  if (minute.startsWith('*/')) {
    const interval = parseInt(minute.substring(2));
    if (hour === '*') return Math.floor(1440 / interval);
    return Math.floor(60 / interval);
  }
  // Every hour
  if (minute !== '*' && hour === '*') return 24;
  // Specific times
  if (minute !== '*' && hour !== '*') return 1;
  
  return 1;
}

// Estimate cost per edge function call based on type
function estimateFunctionCost(functionName: string): number {
  // AI-heavy functions (use external APIs)
  if (functionName.includes('ai-') || 
      functionName.includes('generate-') || 
      functionName.includes('process-') ||
      functionName.includes('analyze-')) {
    return 0.01; // ~$0.01 per AI call
  }
  // SMS functions
  if (functionName.includes('sms') || functionName.includes('verification')) {
    return 0.0075; // ~$0.0075 per SMS
  }
  // Email functions
  if (functionName.includes('email') || functionName.includes('send-')) {
    return 0.0001; // Essentially free with Resend
  }
  // Database/utility functions
  return 0.0001; // Minimal compute cost
}

export const useCostMetrics = () => {
  // Fetch AI usage logs for cost estimation
  const { data: aiUsageLogs, isLoading: aiLoading } = useQuery({
    queryKey: ['cost-ai-usage'],
    queryFn: async () => {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('function_name, created_at, tokens_used, success')
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Group by function and calculate costs
      const byFunction: Record<string, { count: number; tokens: number; dailyCount: number }> = {};
      
      (data || []).forEach(log => {
        const fn = log.function_name;
        if (!byFunction[fn]) {
          byFunction[fn] = { count: 0, tokens: 0, dailyCount: 0 };
        }
        byFunction[fn].count++;
        byFunction[fn].tokens += log.tokens_used || 0;
        
        if (new Date(log.created_at) >= dayAgo) {
          byFunction[fn].dailyCount++;
        }
      });
      
      return { byFunction, totalLogs: data?.length || 0 };
    },
    refetchInterval: 60000,
  });

  // Fetch cron jobs from config
  const { data: cronJobs, isLoading: cronLoading } = useQuery({
    queryKey: ['cost-cron-jobs'],
    queryFn: async (): Promise<CronJobCost[]> => {
      // Define known cron jobs from the system
      const knownCronJobs = [
        { name: 'cleanup-stale-activity', schedule: '* * * * *', costDriver: 'Database cleanup' },
        { name: 'process-booking-reminders', schedule: '* * * * *', costDriver: 'Email/SMS' },
        { name: 'monitor-region-health', schedule: '* * * * *', costDriver: 'Health checks' },
        { name: 'verify-database-backups', schedule: '* * * * *', costDriver: 'Database queries' },
        { name: 'auto-reengagement-daily', schedule: '0 9 * * *', costDriver: 'AI + Email' },
        { name: 'calculate-kpi-metrics', schedule: '0 0 * * *', costDriver: 'Database aggregation' },
        { name: 'calculate-sales-kpis', schedule: '0 1 * * *', costDriver: 'Database aggregation' },
        { name: 'calculate-web-kpis', schedule: '0 2 * * *', costDriver: 'Database aggregation' },
        { name: 'process-meeting-intelligence', schedule: '*/15 * * * *', costDriver: 'AI analysis' },
        { name: 'sync-revenue-metrics', schedule: '0 3 * * *', costDriver: 'Database sync' },
        { name: 'predict-hiring-outcomes', schedule: '0 4 * * *', costDriver: 'ML predictions' },
        { name: 'predict-aggregated-hiring', schedule: '0 5 * * *', costDriver: 'AI analysis' },
      ];

      return knownCronJobs.map(job => {
        const executionsPerDay = calculateDailyExecutions(job.schedule);
        const costPerExecution = estimateFunctionCost(job.name);
        
        return {
          name: job.name,
          schedule: job.schedule,
          executionsPerDay,
          estimatedDailyCost: executionsPerDay * costPerExecution,
          status: 'active' as const,
          costDriver: job.costDriver,
        };
      });
    },
  });

  // Fetch storage metrics
  const { data: storageMetrics, isLoading: storageLoading } = useQuery({
    queryKey: ['cost-storage'],
    queryFn: async (): Promise<StorageMetric[]> => {
      // Get bucket info (simplified - actual sizes would need edge function)
      const buckets = [
        { name: 'avatars', estimatedSize: 50 * 1024 * 1024, files: 80 },
        { name: 'resumes', estimatedSize: 100 * 1024 * 1024, files: 50 },
        { name: 'job-descriptions', estimatedSize: 20 * 1024 * 1024, files: 30 },
        { name: 'meeting-recordings', estimatedSize: 500 * 1024 * 1024, files: 25 },
        { name: 'documents', estimatedSize: 30 * 1024 * 1024, files: 40 },
      ];

      return buckets.map(bucket => ({
        bucketName: bucket.name,
        sizeBytes: bucket.estimatedSize,
        fileCount: bucket.files,
        // S3 pricing: ~$0.023 per GB per month
        estimatedMonthlyCost: (bucket.estimatedSize / (1024 * 1024 * 1024)) * 0.023,
      }));
    },
  });

  // Calculate cost summary
  const costSummary: CostSummary | undefined = aiUsageLogs && cronJobs && storageMetrics ? (() => {
    // AI costs
    const aiDailyCost = Object.entries(aiUsageLogs.byFunction).reduce((sum, [fn, data]) => {
      return sum + data.dailyCount * estimateFunctionCost(fn);
    }, 0);

    // Cron job costs
    const cronDailyCost = cronJobs.reduce((sum, job) => sum + job.estimatedDailyCost, 0);

    // Storage costs (monthly, divide by 30 for daily)
    const storageDailyCost = storageMetrics.reduce((sum, s) => sum + s.estimatedMonthlyCost, 0) / 30;

    // Database (Supabase free tier, estimate based on usage)
    const dbDailyCost = 0.10; // Rough estimate

    const dailyEstimate = aiDailyCost + cronDailyCost + storageDailyCost + dbDailyCost;

    return {
      dailyEstimate,
      weeklyEstimate: dailyEstimate * 7,
      monthlyEstimate: dailyEstimate * 30,
      trend: 'stable' as const,
      trendPercentage: 0,
      breakdown: [
        { category: 'AI & ML', amount: aiDailyCost * 30, percentage: (aiDailyCost / dailyEstimate) * 100 },
        { category: 'Cron Jobs', amount: cronDailyCost * 30, percentage: (cronDailyCost / dailyEstimate) * 100 },
        { category: 'Storage', amount: storageDailyCost * 30, percentage: (storageDailyCost / dailyEstimate) * 100 },
        { category: 'Database', amount: dbDailyCost * 30, percentage: (dbDailyCost / dailyEstimate) * 100 },
      ],
    };
  })() : undefined;

  // Generate cost metrics for KPIs
  const costMetrics: CostMetric[] = aiUsageLogs ? Object.entries(aiUsageLogs.byFunction).map(([fn, data]) => ({
    id: `cost-${fn}`,
    category: fn.includes('ai-') ? 'ai' : fn.includes('send-') ? 'communication' : 'infrastructure',
    name: fn,
    displayName: fn.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    estimatedCost: data.dailyCount * estimateFunctionCost(fn),
    usageCount: data.dailyCount,
    unit: 'calls/day',
    costPerUnit: estimateFunctionCost(fn),
    trend: 'stable',
    trendPercentage: 0,
  })) : [];

  // Generate budget alerts
  const budgetAlerts: BudgetAlert[] = [];
  
  if (costSummary) {
    // Warning if daily cost exceeds $5
    if (costSummary.dailyEstimate > 5) {
      budgetAlerts.push({
        id: 'daily-cost-warning',
        type: 'warning',
        message: `Daily costs (€${costSummary.dailyEstimate.toFixed(2)}) exceed €5 threshold`,
        category: 'Overall',
        currentSpend: costSummary.dailyEstimate,
        budgetLimit: 5,
        percentageUsed: (costSummary.dailyEstimate / 5) * 100,
      });
    }

    // Critical if monthly exceeds $200
    if (costSummary.monthlyEstimate > 200) {
      budgetAlerts.push({
        id: 'monthly-cost-critical',
        type: 'critical',
        message: `Monthly costs (€${costSummary.monthlyEstimate.toFixed(2)}) exceed €200 threshold`,
        category: 'Overall',
        currentSpend: costSummary.monthlyEstimate,
        budgetLimit: 200,
        percentageUsed: (costSummary.monthlyEstimate / 200) * 100,
      });
    }
  }

  return {
    costMetrics,
    cronJobs: cronJobs || [],
    storageMetrics: storageMetrics || [],
    costSummary,
    budgetAlerts,
    isLoading: aiLoading || cronLoading || storageLoading,
    aiUsageByFunction: aiUsageLogs?.byFunction || {},
  };
};
