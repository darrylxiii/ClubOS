import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface CommandCenterSummary {
  health: {
    status: 'operational' | 'degraded' | 'down';
    activeUsers1h: number;
    totalErrors1h: number;
    criticalErrors1h: number;
    avgResponseTime: number;
  };
  tasks: {
    pendingApprovals: number;
    overdueItems: number;
    pendingApplications: number;
    securityAlerts: number;
  };
  anomalies: {
    active: number;
    critical: number;
  };
}

export function useCommandCenterData() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<CommandCenterSummary>({
    queryKey: ['command-center-summary'],
    queryFn: async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Fetch all metrics in parallel
      const [
        healthResult,
        pendingApprovalsResult,
        pendingApplicationsResult,
        securityAlertsResult,
        overdueTasksResult,
        anomaliesResult,
      ] = await Promise.all([
        // System health
        supabase.rpc('get_realtime_system_health'),
        // Pending member approvals
        supabase.from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('account_status', 'pending'),
        // Pending applications
        supabase.from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'applied'),
        // Active security alerts
        supabase.from('security_alerts')
          .select('id', { count: 'exact', head: true })
          .eq('is_dismissed', false),
        // Overdue tasks
        supabase.from('club_tasks')
          .select('id', { count: 'exact', head: true })
          .lt('due_date', now.toISOString())
          .neq('status', 'completed'),
        // Active anomalies
        supabase.from('detected_anomalies')
          .select('id, severity', { count: 'exact' })
          .is('resolved_at', null),
      ]);

      const healthData = healthResult.data as any;
      const anomaliesList = anomaliesResult.data || [];
      const criticalAnomalies = anomaliesList.filter((a: any) => a.severity === 'critical').length;

      // Determine platform status
      let status: 'operational' | 'degraded' | 'down' = 'operational';
      if ((healthData?.critical_errors_1h || 0) > 5) {
        status = 'down';
      } else if ((healthData?.total_errors_1h || 0) > 10 || criticalAnomalies > 0) {
        status = 'degraded';
      }

      return {
        health: {
          status,
          activeUsers1h: healthData?.active_users_1h || 0,
          totalErrors1h: healthData?.total_errors_1h || 0,
          criticalErrors1h: healthData?.critical_errors_1h || 0,
          avgResponseTime: healthData?.avg_response_time_ms || 150,
        },
        tasks: {
          pendingApprovals: pendingApprovalsResult.count || 0,
          overdueItems: overdueTasksResult.count || 0,
          pendingApplications: pendingApplicationsResult.count || 0,
          securityAlerts: securityAlertsResult.count || 0,
        },
        anomalies: {
          active: anomaliesResult.count || 0,
          critical: criticalAnomalies,
        },
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });

  // Set up realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('command-center-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'detected_anomalies' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['command-center-summary'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'security_alerts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['command-center-summary'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'error_logs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['command-center-summary'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
