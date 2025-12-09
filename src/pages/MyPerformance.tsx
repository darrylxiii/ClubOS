import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { EmployeeOverviewCard } from "@/components/employees/EmployeeOverviewCard";
import { CommissionsTracker } from "@/components/employees/CommissionsTracker";
import { TargetsProgressCard } from "@/components/employees/TargetsProgressCard";
import { PlacementHistory } from "@/components/employees/PlacementHistory";
import { ActivityLoggerWidget } from "@/components/employees/ActivityLoggerWidget";
import { ActivityFeed } from "@/components/employees/ActivityFeed";
import { TrainingRecordsPanel } from "@/components/employees/TrainingRecordsPanel";
import { OnboardingChecklist } from "@/components/employees/OnboardingChecklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useEmployeeProfile, 
  useEmployeeTargets, 
  useEmployeeCommissions,
  useEmployeeMetrics 
} from "@/hooks/useEmployeeProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Clock, RefreshCw, Activity, GraduationCap, ListChecks } from "lucide-react";
import { motion } from "framer-motion";
import { startOfMonth, endOfMonth } from "date-fns";

export default function MyPerformance() {
  const { data: employee, isLoading: employeeLoading, refetch } = useEmployeeProfile();
  const { data: targets, isLoading: targetsLoading } = useEmployeeTargets(employee?.id);
  const { data: commissions, isLoading: commissionsLoading } = useEmployeeCommissions(employee?.id);
  const { data: metrics, isLoading: metricsLoading } = useEmployeeMetrics(employee?.id);

  // Get hours worked this month from time_entries
  const { data: hoursData } = useQuery({
    queryKey: ['my-hours-this-month', employee?.user_id],
    queryFn: async () => {
      if (!employee?.user_id) return { hours: 0 };

      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      const { data, error } = await supabase
        .from('time_entries')
        .select('duration_seconds')
        .eq('user_id', employee.user_id)
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString());

      if (error) throw error;

      const totalSeconds = data?.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0) || 0;
      return { hours: Math.round(totalSeconds / 3600) };
    },
    enabled: !!employee?.user_id,
  });

  const currentTarget = targets?.find(t => {
    const now = new Date();
    return new Date(t.period_start) <= now && new Date(t.period_end) >= now;
  }) || null;

  const isLoading = employeeLoading || targetsLoading || commissionsLoading || metricsLoading;

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist', 'partner']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Performance</h1>
              <p className="text-muted-foreground">
                Track your commissions, targets, and placements
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

          {/* No Employee Profile Alert */}
          {!employeeLoading && !employee && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your employee profile hasn't been set up yet. Contact your manager or admin to configure your profile and commission structure.
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Main Content */}
          {!isLoading && employee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Overview Card */}
              <EmployeeOverviewCard
                employee={employee}
                metrics={metrics || null}
                currentTarget={currentTarget}
                hoursThisMonth={hoursData?.hours || 0}
              />

              {/* Tabbed Content */}
              <Tabs defaultValue="performance" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="performance" className="gap-2">
                    <Clock className="h-4 w-4" />
                    Performance
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="gap-2">
                    <Activity className="h-4 w-4" />
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="training" className="gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Training
                  </TabsTrigger>
                  <TabsTrigger value="onboarding" className="gap-2">
                    <ListChecks className="h-4 w-4" />
                    Onboarding
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="performance">
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Left Column */}
                    <div className="space-y-6">
                      <TargetsProgressCard 
                        targets={targets || []} 
                        isLoading={targetsLoading}
                      />
                      
                      <PlacementHistory 
                        placements={commissions || []} 
                        isLoading={commissionsLoading}
                      />
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      <CommissionsTracker 
                        commissions={commissions || []} 
                        isLoading={commissionsLoading}
                      />

                      {/* Quick Stats */}
                      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Time & Productivity
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-xs text-muted-foreground">Hours This Month</p>
                              <p className="text-2xl font-bold">{hoursData?.hours || 0}h</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-xs text-muted-foreground">Revenue per Hour</p>
                              <p className="text-2xl font-bold">
                                €{hoursData?.hours && metrics?.total_commissions 
                                  ? Math.round(metrics.total_commissions / hoursData.hours)
                                  : 0}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <ActivityLoggerWidget />
                    <ActivityFeed userId={employee.user_id} />
                  </div>
                </TabsContent>

                <TabsContent value="training">
                  <TrainingRecordsPanel />
                </TabsContent>

                <TabsContent value="onboarding">
                  <OnboardingChecklist />
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </div>
      </RoleGate>
    </AppLayout>
  );
}
