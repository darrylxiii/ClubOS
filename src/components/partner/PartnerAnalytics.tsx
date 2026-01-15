import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, Clock, Target } from "lucide-react";

interface PartnerAnalyticsProps {
  companyId: string;
}

export const PartnerAnalytics = ({ companyId }: PartnerAnalyticsProps) => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>({
    pipelineHealth: [],
    conversionRates: [],
    timeInStage: [],
    overview: {
      totalCandidates: 0,
      activeJobs: 0,
      avgTimeToHire: 0,
      offerAcceptanceRate: 0,
    }
  });

  useEffect(() => {
    fetchAnalytics();
  }, [companyId]);

  const fetchAnalytics = async () => {
    try {
      // Fetch jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, pipeline_stages, status')
        .eq('company_id', companyId);

      // Fetch applications with created_at
      const jobIds = jobs?.map(j => j.id) || [];
      const { data: applications } = await supabase
        .from('applications')
        .select('id, job_id, status, applied_at, current_stage_index, stages, created_at, updated_at')
        .in('job_id', jobIds);

      // Parse pipeline stages from first job
      const firstJobStages = jobs?.[0]?.pipeline_stages;
      const stages = Array.isArray(firstJobStages) ? firstJobStages : [];

      // Calculate avgTimeToHire from hired applications
      const hiredApps = applications?.filter(a => a.status === 'hired') || [];
      let avgTimeToHire = 0;
      
      if (hiredApps.length > 0) {
        const totalDays = hiredApps.reduce((sum, app) => {
          const appliedDate = new Date(app.applied_at || app.created_at);
          const hiredDate = new Date(app.updated_at);
          const days = Math.max(0, Math.ceil((hiredDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24)));
          return sum + days;
        }, 0);
        avgTimeToHire = Math.round(totalDays / hiredApps.length);
      }

      // Calculate offer acceptance rate
      const offeredApps = applications?.filter(a => 
        a.status === 'offered' || a.status === 'hired'
      ) || [];
      const acceptedApps = hiredApps.length;
      const offerAcceptanceRate = offeredApps.length > 0 
        ? Math.round((acceptedApps / offeredApps.length) * 100) 
        : 0;

      // Calculate pipeline health
      const pipelineHealth = stages.map((stage: any) => ({
        name: stage.name,
        count: applications?.filter(a => a.current_stage_index === stage.order).length || 0,
      }));

      // Calculate conversion rates between stages
      const totalApps = applications?.length || 0;
      const conversionRates = Array.from({ length: stages.length - 1 }, (_, i) => {
        const currentStage = applications?.filter(a => a.current_stage_index === i).length || 0;
        const nextStage = applications?.filter(a => a.current_stage_index === i + 1).length || 0;
        const currentStageObj = stages[i] as any;
        const nextStageObj = stages[i + 1] as any;
        const currentStageName = currentStageObj?.name || `Stage ${i}`;
        const nextStageName = nextStageObj?.name || `Stage ${i + 1}`;
        return {
          stage: `${currentStageName} → ${nextStageName}`,
          rate: currentStage > 0 ? Math.round((nextStage / currentStage) * 100) : 0,
        };
      });

      setAnalytics({
        pipelineHealth,
        conversionRates,
        timeInStage: [],
        overview: {
          totalCandidates: totalApps,
          activeJobs: jobs?.filter(j => j.status === 'published').length || 0,
          avgTimeToHire,
          offerAcceptanceRate,
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-64 bg-muted rounded"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalCandidates}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.activeJobs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time to Hire</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.avgTimeToHire} days</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offer Acceptance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.offerAcceptanceRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline Health</TabsTrigger>
          <TabsTrigger value="conversion">Conversion Rates</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <Card>
            <CardHeader>
              <CardTitle>Candidates by Stage</CardTitle>
              <CardDescription>Current distribution across pipeline stages</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.pipelineHealth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion">
          <Card>
            <CardHeader>
              <CardTitle>Stage Conversion Rates</CardTitle>
              <CardDescription>Percentage of candidates advancing between stages</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.conversionRates}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="rate" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};