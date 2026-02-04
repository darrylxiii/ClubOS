import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FunctionMetric {
  name: string;
  invocations: number;
  successRate: number;
  avgResponseTime: number;
  errors: number;
}

interface EdgeFunctionHealth {
  overallStatus: 'healthy' | 'degraded' | 'critical';
  totalInvocations: number;
  overallSuccessRate: number;
  avgResponseTime: number;
  totalErrors: number;
  functions: FunctionMetric[];
  criticalFunctions: string[];
}

export function useEdgeFunctionHealth() {
  return useQuery({
    queryKey: ['edge-function-health'],
    queryFn: async (): Promise<EdgeFunctionHealth> => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Get performance metrics for edge functions
      const { data: metrics, error } = await supabase
        .from('performance_metrics')
        .select('metric_type, value, metadata, created_at')
        .gte('created_at', oneHourAgo.toISOString())
        .like('metric_type', '%_duration%');

      if (error) throw error;

      // Get AI usage logs which track edge function calls
      const { data: aiLogs } = await supabase
        .from('ai_usage_logs')
        .select('function_name, success, response_time_ms, error_message, created_at')
        .gte('created_at', oneHourAgo.toISOString());

      // Aggregate by function
      const functionStats: Record<string, { 
        invocations: number; 
        successes: number; 
        totalTime: number;
        errors: number;
      }> = {};

      aiLogs?.forEach(log => {
        const name = log.function_name || 'unknown';
        if (!functionStats[name]) {
          functionStats[name] = { invocations: 0, successes: 0, totalTime: 0, errors: 0 };
        }
        functionStats[name].invocations++;
        if (log.success) {
          functionStats[name].successes++;
        } else {
          functionStats[name].errors++;
        }
        functionStats[name].totalTime += log.response_time_ms || 0;
      });

      const functions: FunctionMetric[] = Object.entries(functionStats)
        .map(([name, stats]) => ({
          name,
          invocations: stats.invocations,
          successRate: stats.invocations > 0 
            ? Math.round((stats.successes / stats.invocations) * 100) 
            : 100,
          avgResponseTime: stats.invocations > 0 
            ? Math.round(stats.totalTime / stats.invocations) 
            : 0,
          errors: stats.errors,
        }))
        .sort((a, b) => b.invocations - a.invocations);

      // Calculate overall metrics
      const totalInvocations = functions.reduce((sum, f) => sum + f.invocations, 0);
      const totalSuccesses = functions.reduce((sum, f) => sum + (f.invocations * f.successRate / 100), 0);
      const totalErrors = functions.reduce((sum, f) => sum + f.errors, 0);
      const totalTime = functions.reduce((sum, f) => sum + (f.invocations * f.avgResponseTime), 0);

      const overallSuccessRate = totalInvocations > 0 
        ? Math.round((totalSuccesses / totalInvocations) * 100) 
        : 100;
      const avgResponseTime = totalInvocations > 0 
        ? Math.round(totalTime / totalInvocations) 
        : 0;

      // Identify critical functions (success rate < 90%)
      const criticalFunctions = functions
        .filter(f => f.successRate < 90 && f.invocations > 5)
        .map(f => f.name);

      // Determine overall status
      let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (overallSuccessRate < 80 || criticalFunctions.length > 2) {
        overallStatus = 'critical';
      } else if (overallSuccessRate < 95 || criticalFunctions.length > 0) {
        overallStatus = 'degraded';
      }

      return {
        overallStatus,
        totalInvocations,
        overallSuccessRate,
        avgResponseTime,
        totalErrors,
        functions: functions.slice(0, 5), // Top 5 functions
        criticalFunctions,
      };
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000,
  });
}
