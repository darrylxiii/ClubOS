import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { OceanBackgroundVideo } from "@/components/OceanBackgroundVideo";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Users, TrendingUp, AlertTriangle, Search, BarChart3, RefreshCw, Brain, Target, FileText, Grid } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import RealTimeActivityTab from "@/components/admin/activity/RealTimeActivityTab";
import EngagementAnalyticsTab from "@/components/admin/activity/EngagementAnalyticsTab";
import FrustrationSignalsTab from "@/components/admin/activity/FrustrationSignalsTab";
import SearchAnalyticsTab from "@/components/admin/activity/SearchAnalyticsTab";
import { UserSegmentsTab } from "@/components/admin/activity/UserSegmentsTab";
import { FeatureAnalyticsTab } from "@/components/admin/activity/FeatureAnalyticsTab";
import { CandidateIntelligenceTab } from "@/components/admin/activity/CandidateIntelligenceTab";
import { AdminIntelligenceTab } from "@/components/admin/activity/AdminIntelligenceTab";
import { PredictiveAnalyticsTab } from "@/components/admin/activity/PredictiveAnalyticsTab";
import { ExportReportsTab } from "@/components/admin/activity/ExportReportsTab";
import { UserJourneyVisualization } from "@/components/admin/UserJourneyVisualization";
import { PartnerHealthDashboard } from "@/components/admin/PartnerHealthDashboard";

export default function UserActivity() {
  const [activeTab, setActiveTab] = useState("realtime");

  const { data: overviewMetrics, refetch } = useQuery({
    queryKey: ['activity-overview'],
    queryFn: async () => {
      const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
      
      const [sessions, events, frustrations, legacyEvents] = await Promise.all([
        supabase.from('user_page_analytics').select('*', { count: 'exact' }).gte('entry_timestamp', oneDayAgo),
        supabase.from('user_session_events').select('*', { count: 'exact' }).gte('event_timestamp', oneDayAgo),
        supabase.from('user_frustration_signals').select('*', { count: 'exact' }).gte('created_at', oneDayAgo),
        supabase.from('user_events').select('*', { count: 'exact' }).gte('created_at', oneDayAgo)
      ]);

      return {
        sessions: (sessions.count || 0) + (legacyEvents.count || 0),
        events: events.count || 0,
        frustrations: frustrations.count || 0,
        activeUsers: sessions.data?.filter((s: any) => !s.exit_timestamp).length || 0
      };
    },
    refetchInterval: 30000
  });

  return (
    <AppLayout>
      <OceanBackgroundVideo />
      <div className="relative z-10">
        <div className="container mx-auto py-8 space-y-8 animate-fade-in">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>User Activity</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
                <Activity className="h-8 w-8 text-primary" />
                User Activity Analytics
              </h1>
              <p className="text-muted-foreground mt-2">
                Comprehensive tracking and analysis of user behavior
              </p>
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewMetrics?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Currently browsing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions (24h)</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewMetrics?.sessions || 0}</div>
            <p className="text-xs text-muted-foreground">Total sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events (24h)</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewMetrics?.events || 0}</div>
            <p className="text-xs text-muted-foreground">User interactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frustrations (24h)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewMetrics?.frustrations || 0}</div>
            <p className="text-xs text-muted-foreground">Issues detected</p>
          </CardContent>
        </Card>
      </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12">
              <TabsTrigger value="realtime">
                <Activity className="h-4 w-4 mr-2" />
                Real-Time
              </TabsTrigger>
              <TabsTrigger value="segments">
                <Grid className="h-4 w-4 mr-2" />
                Segments
              </TabsTrigger>
              <TabsTrigger value="features">
                <Target className="h-4 w-4 mr-2" />
                Features
              </TabsTrigger>
              <TabsTrigger value="candidates">
                <Users className="h-4 w-4 mr-2" />
                Candidates
              </TabsTrigger>
              <TabsTrigger value="admins">
                <Users className="h-4 w-4 mr-2" />
                Admins
              </TabsTrigger>
              <TabsTrigger value="journeys">
                <TrendingUp className="h-4 w-4 mr-2" />
                Journeys
              </TabsTrigger>
              <TabsTrigger value="engagement">
                <BarChart3 className="h-4 w-4 mr-2" />
                Engagement
              </TabsTrigger>
              <TabsTrigger value="frustration">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Frustration
              </TabsTrigger>
              <TabsTrigger value="search">
                <Search className="h-4 w-4 mr-2" />
                Search
              </TabsTrigger>
              <TabsTrigger value="predictive">
                <Brain className="h-4 w-4 mr-2" />
                Predictive
              </TabsTrigger>
              <TabsTrigger value="partners">
                <Users className="h-4 w-4 mr-2" />
                Partners
              </TabsTrigger>
              <TabsTrigger value="reports">
                <FileText className="h-4 w-4 mr-2" />
                Reports
              </TabsTrigger>
            </TabsList>

            <TabsContent value="realtime" className="space-y-4">
              <RealTimeActivityTab />
            </TabsContent>

            <TabsContent value="segments" className="space-y-4">
              <UserSegmentsTab />
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <FeatureAnalyticsTab />
            </TabsContent>

            <TabsContent value="candidates" className="space-y-4">
              <CandidateIntelligenceTab />
            </TabsContent>

            <TabsContent value="admins" className="space-y-4">
              <AdminIntelligenceTab />
            </TabsContent>

            <TabsContent value="journeys" className="space-y-4">
              <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
                <CardHeader>
                  <CardTitle>User Journey Analysis</CardTitle>
                  <CardDescription>
                    Understand how users navigate through your application
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserJourneyVisualization />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="engagement" className="space-y-4">
              <EngagementAnalyticsTab />
            </TabsContent>

            <TabsContent value="frustration" className="space-y-4">
              <FrustrationSignalsTab />
            </TabsContent>

            <TabsContent value="search" className="space-y-4">
              <SearchAnalyticsTab />
            </TabsContent>

            <TabsContent value="predictive" className="space-y-4">
              <PredictiveAnalyticsTab />
            </TabsContent>

            <TabsContent value="partners" className="space-y-4">
              <PartnerHealthDashboard />
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <ExportReportsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
