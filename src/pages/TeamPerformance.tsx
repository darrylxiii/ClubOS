import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { TeamOverviewDashboard } from "@/components/employees/TeamOverviewDashboard";
import { TeamPerformanceComparison } from "@/components/employees/TeamPerformanceComparison";
import { TeamCommissionsApproval } from "@/components/employees/TeamCommissionsApproval";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useEmployeeProfile, 
  useDirectReports,
  EmployeeCommission
} from "@/hooks/useEmployeeProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Users, RefreshCw, BarChart3, ClipboardCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function TeamPerformance() {
  const { data: employee, isLoading: employeeLoading, refetch } = useEmployeeProfile();
  const { data: directReports, isLoading: reportsLoading } = useDirectReports(employee?.id);

  // Get metrics for each direct report
  const { data: teamMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['team-metrics', directReports?.map(r => r.id)],
    queryFn: async () => {
      if (!directReports?.length) return {};

      const metrics: Record<string, {
        revenue: number;
        placements: number;
        targetProgress: number;
        hoursThisMonth: number;
      }> = {};

      for (const report of directReports) {
        const { data: commissions } = await supabase
          .from('employee_commissions')
          .select('gross_amount, source_type')
          .eq('employee_id', report.id)
          .in('status', ['approved', 'paid']);

        const { data: targets } = await supabase
          .from('employee_targets')
          .select('*')
          .eq('employee_id', report.id)
          .lte('period_start', new Date().toISOString())
          .gte('period_end', new Date().toISOString())
          .limit(1);

        const revenue = commissions?.reduce((sum, c) => sum + c.gross_amount, 0) || 0;
        const placements = commissions?.filter(c => c.source_type === 'placement').length || 0;
        
        const target = targets?.[0];
        const targetProgress = target?.revenue_target 
          ? ((target.revenue_achieved ?? 0) / target.revenue_target) * 100 
          : 0;

        metrics[report.id] = {
          revenue,
          placements,
          targetProgress,
          hoursThisMonth: 0, // Would need time_entries query
        };
      }

      return metrics;
    },
    enabled: !!directReports?.length,
  });

  // Get pending commissions for approval
  const { data: pendingCommissions, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-commissions', directReports?.map(r => r.id)],
    queryFn: async () => {
      if (!directReports?.length) return [];

      const { data, error } = await supabase
        .from('employee_commissions')
        .select('*')
        .in('employee_id', directReports.map(r => r.id))
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with employee names
      return (data || []).map(commission => {
        const report = directReports.find(r => r.id === commission.employee_id);
        const profileData = report?.profile as { full_name?: string; avatar_url?: string | null } | undefined;
        return {
          ...commission,
          employeeName: profileData?.full_name || 'Employee',
          employeeAvatar: profileData?.avatar_url || undefined,
        };
      }) as (EmployeeCommission & { employeeName?: string; employeeAvatar?: string })[];
    },
    enabled: !!directReports?.length,
  });

  // Build performance data for comparison chart
  const performanceData = (directReports || []).map(report => {
    const metrics = teamMetrics?.[report.id];
    const profileData = report.profile as { full_name?: string; avatar_url?: string | null } | undefined;
    return {
      employeeId: report.id,
      name: profileData?.full_name || 'Employee',
      avatar: profileData?.avatar_url || undefined,
      revenue: metrics?.revenue || 0,
      placements: metrics?.placements || 0,
      trend: [], // Would need historical data
    };
  });

  const isLoading = employeeLoading || reportsLoading;
  const isManager = employee && directReports && directReports.length > 0;

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Team Performance</h1>
              <p className="text-muted-foreground">
                Manage and track your team's performance and commissions
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Not a Manager Alert */}
          {!isLoading && !isManager && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don't have any direct reports. This page is for managers to track their team's performance.
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="grid gap-6 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-48 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Main Content */}
          {!isLoading && isManager && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="overview" className="gap-2">
                    <Users className="h-4 w-4" />
                    Team Overview
                  </TabsTrigger>
                  <TabsTrigger value="comparison" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Performance Comparison
                  </TabsTrigger>
                  <TabsTrigger value="approvals" className="gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    Commission Approvals
                    {(pendingCommissions?.length || 0) > 0 && (
                      <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                        {pendingCommissions?.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <TeamOverviewDashboard
                    directReports={directReports || []}
                    teamMetrics={teamMetrics || {}}
                    isLoading={metricsLoading}
                  />
                </TabsContent>

                <TabsContent value="comparison">
                  <TeamPerformanceComparison
                    directReports={directReports || []}
                    performanceData={performanceData}
                    isLoading={metricsLoading}
                  />
                </TabsContent>

                <TabsContent value="approvals">
                  <TeamCommissionsApproval
                    pendingCommissions={pendingCommissions || []}
                    isLoading={pendingLoading}
                  />
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </div>
      </RoleGate>
    </AppLayout>
  );
}
