import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Calendar, Users, Clock, CheckCircle } from "lucide-react";
import { PredictiveAnalyticsDashboard } from "@/components/intelligence/PredictiveAnalyticsDashboard";
import { UpcomingInterviewsWidget } from "@/components/partner/UpcomingInterviewsWidget";
import { ClientHealthDashboard } from "@/components/client-health/ClientHealthDashboard";
import { StrategistLeaderboard } from "@/components/leaderboard/StrategistLeaderboard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfWeek, endOfWeek } from "date-fns";

interface HiringManagerDashboardProps {
  jobId: string;
}

export function HiringManagerDashboard({ jobId }: HiringManagerDashboardProps) {
  // Fetch real interview stats for this week
  const { data: weeklyStats, isLoading: statsLoading } = useQuery({
    queryKey: ['hiring-manager-stats', jobId],
    queryFn: async () => {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      // Get interviews this week
      const { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('id, status, scheduled_start')
        .eq('job_id', jobId)
        .gte('scheduled_start', weekStart.toISOString())
        .lte('scheduled_start', weekEnd.toISOString());

      if (meetingsError) throw meetingsError;

      // Get pending actions (incomplete scorecards)
      const { data: pendingActions, error: actionsError } = await supabase
        .from('candidate_scorecards')
        .select('id, status')
        .is('submitted_at', null);

      if (actionsError) throw actionsError;

      // Get active candidates in pipeline
      const { data: activeCandidates, error: candidatesError } = await supabase
        .from('applications')
        .select('id, status, updated_at')
        .eq('job_id', jobId)
        .not('status', 'in', '("hired","rejected","withdrawn")');

      if (candidatesError) throw candidatesError;

      // Calculate avg time in stage
      const avgTimeInStage = activeCandidates.length > 0 
        ? Math.round(
            activeCandidates.reduce((acc, app) => {
              const daysInStage = Math.floor(
                (new Date().getTime() - new Date(app.updated_at).getTime()) / (1000 * 60 * 60 * 24)
              );
              return acc + daysInStage;
            }, 0) / activeCandidates.length
          )
        : 0;

      return {
        interviewsThisWeek: meetings?.length || 0,
        pendingActions: pendingActions?.length || 0,
        activeCandidates: activeCandidates?.length || 0,
        avgTimeInStage: avgTimeInStage
      };
    },
    staleTime: 30000
  });

  return (
    <div className="space-y-6">
      {/* Coordination Command Center */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Hiring Coordination Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              {/* Quick stats and alerts */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Interviews This Week</p>
                    </div>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      <p className="text-2xl font-bold">{weeklyStats?.interviewsThisWeek ?? 0}</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Pending Actions</p>
                    </div>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      <p className="text-2xl font-bold">{weeklyStats?.pendingActions ?? 0}</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Active Candidates</p>
                    </div>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      <p className="text-2xl font-bold">{weeklyStats?.activeCandidates ?? 0}</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Avg Time in Stage</p>
                    </div>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      <p className="text-2xl font-bold">{weeklyStats?.avgTimeInStage ?? 0}d</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="scheduling">
              <div className="mt-4">
                <UpcomingInterviewsWidget jobId={jobId} />
              </div>
            </TabsContent>
            
            <TabsContent value="feedback">
              <p className="text-sm text-muted-foreground mt-4">
                Feedback management coming soon
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Predictive Analytics */}
      <PredictiveAnalyticsDashboard jobId={jobId} />

      {/* Client Health & Team Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ClientHealthDashboard />
        <StrategistLeaderboard />
      </div>
    </div>
  );
}
