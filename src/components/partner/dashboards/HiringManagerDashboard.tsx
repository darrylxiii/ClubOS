import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Calendar, MessageSquare, TrendingDown, Users, Heart } from "lucide-react";
import { PredictiveAnalyticsDashboard } from "@/components/intelligence/PredictiveAnalyticsDashboard";
import { UpcomingInterviewsWidget } from "@/components/partner/UpcomingInterviewsWidget";
import { ClientHealthDashboard } from "@/components/client-health/ClientHealthDashboard";
import { StrategistLeaderboard } from "@/components/leaderboard/StrategistLeaderboard";

interface HiringManagerDashboardProps {
  jobId: string;
}

export function HiringManagerDashboard({ jobId }: HiringManagerDashboardProps) {
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
              <div className="grid grid-cols-4 gap-4 mt-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Interviews This Week</p>
                    <p className="text-2xl font-bold">-</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Pending Actions</p>
                    <p className="text-2xl font-bold">-</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Active Candidates</p>
                    <p className="text-2xl font-bold">-</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Avg Time in Stage</p>
                    <p className="text-2xl font-bold">-d</p>
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
