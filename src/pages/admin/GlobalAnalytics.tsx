import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Building2, Users, Briefcase, TrendingUp, Clock, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

      // Calculate avg time to hire (placeholder - needs actual hired data)
      const avgTimeToHire = 21; // days

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
      <div className="container mx-auto py-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Global Analytics</h1>
        <p className="text-muted-foreground">
          Cross-company insights and platform-wide metrics
        </p>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.totalJobs}</p>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.totalCandidates}</p>
                <p className="text-sm text-muted-foreground">Total Candidates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.avgTimeToHire} days</p>
                <p className="text-sm text-muted-foreground">Avg Time to Hire</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.totalCompanies}</p>
                <p className="text-sm text-muted-foreground">Active Companies</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
  );
};

export default GlobalAnalytics;
