import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription as CardDescriptionOld, CardHeader, CardTitle as CardTitleOld } from "@/components/ui/card";
import {
  AnimatedCard,
  CardBody,
  CardVisual,
  CardTitle,
  CardDescription
} from "@/components/ui/animated-card";
import { Visual1 } from "@/components/ui/visual-1";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DynamicChart } from "@/components/charts/DynamicChart";
import { Building2, Users, Briefcase, TrendingUp, Clock, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/AppLayout";

interface Analytics {
  totalJobs: number;
  totalCandidates: number;
  avgTimeToHire: number;
  totalCompanies: number;
  applicationsPerWeek: Array<{ week: string; applications: number }>;
  conversionFunnel: Array<{ stage: string; count: number }>;
  topCompanies: Array<{ name: string; fillRate: number; totalHires: number }>;
}

const GlobalAnalytics = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch total jobs
      const { count: totalJobs } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });

      // Fetch total applications (unique candidates)
      const { count: totalCandidates } = await supabase
        .from('applications')
        .select('user_id', { count: 'exact', head: true });

      // Fetch total companies
      const { count: totalCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      // Fetch applications data for charts
      const { data: applicationsData } = await supabase
        .from('applications')
        .select('created_at, current_stage_index, stages')
        .order('created_at', { ascending: true });

      // Calculate applications per week
      const weeklyData = (applicationsData || []).reduce((acc, app) => {
        const week = new Date(app.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        acc[week] = (acc[week] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const applicationsPerWeek = Object.entries(weeklyData)
        .slice(-8)
        .map(([week, applications]) => ({ week, applications }));

      // Calculate conversion funnel
      const stageNames = ['Applied', 'Screening', 'Interview', 'Final', 'Offer', 'Hired'];
      const conversionFunnel = stageNames.map((stage, index) => ({
        stage,
        count: (applicationsData || []).filter(app =>
          app.current_stage_index >= index
        ).length,
      }));

      // Calculate avg time to hire from actual hired applications
      const { data: hiredApps } = await supabase
        .from('applications')
        .select('created_at, updated_at, status')
        .eq('status', 'hired');

      let avgTimeToHire = 0;
      if (hiredApps && hiredApps.length > 0) {
        const hireTimes = hiredApps.map(app => {
          const created = new Date(app.created_at).getTime();
          const updated = new Date(app.updated_at).getTime();
          return Math.floor((updated - created) / (1000 * 60 * 60 * 24));
        }).filter(days => days > 0 && days < 365);
        
        avgTimeToHire = hireTimes.length > 0
          ? Math.round(hireTimes.reduce((a, b) => a + b, 0) / hireTimes.length)
          : 0;
      }

      // Fetch top companies by fill rate
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name');

      const { data: jobsData } = await supabase
        .from('jobs')
        .select('company_id, id');

      const { data: hiresData } = await supabase
        .from('applications')
        .select('job_id, stages');

      const companyStats = (companiesData || []).map(company => {
        const companyJobs = (jobsData || []).filter(j => j.company_id === company.id);
        const companyHires = (hiresData || []).filter(app => {
          const job = companyJobs.find(j => j.id === app.job_id);
          if (!job) return false;
          const stages = app.stages as any[];
          return stages?.some((s: any) => s.status?.toLowerCase() === 'hired');
        });

        const fillRate = companyJobs.length > 0
          ? Math.round((companyHires.length / companyJobs.length) * 100)
          : 0;

        return {
          name: company.name,
          fillRate,
          totalHires: companyHires.length,
        };
      });

      const topCompanies = companyStats
        .filter(c => c.totalHires > 0)
        .sort((a, b) => b.fillRate - a.fillRate)
        .slice(0, 5);

      setAnalytics({
        totalJobs: totalJobs || 0,
        totalCandidates: totalCandidates || 0,
        avgTimeToHire,
        totalCompanies: totalCompanies || 0,
        applicationsPerWeek,
        conversionFunnel,
        topCompanies,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!analytics) return null;

  return (
    <AppLayout>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Global Analytics</h1>
          <p className="text-muted-foreground">
            Cross-company insights and platform-wide metrics
          </p>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AnimatedCard>
            <CardVisual>
              <Visual1 mainColor="#3b82f6" secondaryColor="#60a5fa" />
            </CardVisual>
            <CardBody>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold">{analytics.totalJobs.toLocaleString()}</CardTitle>
                  <CardDescription>Total Jobs Posted</CardDescription>
                </div>
              </div>
            </CardBody>
          </AnimatedCard>

          <AnimatedCard>
            <CardVisual>
              <Visual1 mainColor="#8b5cf6" secondaryColor="#a78bfa" />
            </CardVisual>
            <CardBody>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg text-purple-500">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold">{analytics.totalCandidates.toLocaleString()}</CardTitle>
                  <CardDescription>Total Candidates</CardDescription>
                </div>
              </div>
            </CardBody>
          </AnimatedCard>

          <AnimatedCard>
            <CardVisual>
              <Visual1 mainColor="#10b981" secondaryColor="#34d399" />
            </CardVisual>
            <CardBody>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold">{analytics.avgTimeToHire} Days</CardTitle>
                  <CardDescription>Avg Time to Hire</CardDescription>
                </div>
              </div>
            </CardBody>
          </AnimatedCard>

          <AnimatedCard>
            <CardVisual>
              <Visual1 mainColor="#f59e0b" secondaryColor="#fbbf24" />
            </CardVisual>
            <CardBody>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold">{analytics.totalCompanies.toLocaleString()}</CardTitle>
                  <CardDescription>Partners & Companies</CardDescription>
                </div>
              </div>
            </CardBody>
          </AnimatedCard>
        </div>

        {/* Charts */}
        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="applications">Applications Trend</TabsTrigger>
            <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
            <TabsTrigger value="companies">Top Companies</TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>Applications Per Week</CardTitle>
                <CardDescription>Track application volume over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analytics.applicationsPerWeek}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="applications" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="funnel">
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>Candidate progression through pipeline stages</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.conversionFunnel}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Companies</CardTitle>
                <CardDescription>Ranked by fill rate (hires / jobs)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.topCompanies.map((company, index) => (
                    <div key={company.name} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{company.name}</p>
                        <p className="text-sm text-muted-foreground">{company.totalHires} hires</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        <span className="text-xl font-bold">{company.fillRate}%</span>
                      </div>
                    </div>
                  ))}
                  {analytics.topCompanies.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No hiring data available yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default GlobalAnalytics;
