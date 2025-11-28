import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { TrendingUp, Briefcase, FileText, Search } from 'lucide-react';

export function CandidateIntelligenceTab() {
  const { data: candidateMetrics, isLoading } = useQuery({
    queryKey: ['candidate-intelligence'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_activity_metrics')
        .select('*')
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Aggregate daily metrics
  const dailyTrends = candidateMetrics?.reduce((acc, metric) => {
    const date = metric.date;
    if (!acc[date]) {
      acc[date] = {
        date,
        jobsViewed: 0,
        applicationsSubmitted: 0,
        profileUpdates: 0,
        searchQueries: 0,
        totalCandidates: 0,
      };
    }
    
    acc[date].jobsViewed += metric.jobs_viewed || 0;
    acc[date].applicationsSubmitted += metric.applications_submitted || 0;
    acc[date].profileUpdates += metric.profile_updates || 0;
    acc[date].searchQueries += metric.search_queries || 0;
    acc[date].totalCandidates++;
    
    return acc;
  }, {} as Record<string, any>);

  const trendData = Object.values(dailyTrends || {}).map((day: any) => ({
    ...day,
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  // Application funnel
  const totalJobsViewed = candidateMetrics?.reduce((sum, m) => sum + (m.jobs_viewed || 0), 0) || 0;
  const totalApplicationsStarted = candidateMetrics?.reduce((sum, m) => sum + (m.applications_started || 0), 0) || 0;
  const totalApplicationsCompleted = candidateMetrics?.reduce((sum, m) => sum + (m.applications_completed || 0), 0) || 0;
  const totalApplicationsSubmitted = candidateMetrics?.reduce((sum, m) => sum + (m.applications_submitted || 0), 0) || 0;

  const funnelData = [
    { stage: 'Jobs Viewed', count: totalJobsViewed, percentage: 100 },
    { stage: 'Applications Started', count: totalApplicationsStarted, percentage: (totalApplicationsStarted / totalJobsViewed) * 100 },
    { stage: 'Applications Completed', count: totalApplicationsCompleted, percentage: (totalApplicationsCompleted / totalJobsViewed) * 100 },
    { stage: 'Applications Submitted', count: totalApplicationsSubmitted, percentage: (totalApplicationsSubmitted / totalJobsViewed) * 100 },
  ];

  // Average profile completeness
  const avgCompleteness = candidateMetrics?.reduce((sum, m) => sum + (m.profile_completeness || 0), 0) / (candidateMetrics?.length || 1);

  if (isLoading) {
    return <div className="p-6">Loading candidate intelligence...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Candidates</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{candidateMetrics?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Jobs Viewed</CardTitle>
            <Briefcase className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobsViewed}</div>
            <p className="text-xs text-muted-foreground mt-1">Total views</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApplicationsSubmitted}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((totalApplicationsSubmitted / totalJobsViewed) * 100).toFixed(1)}% conversion
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Profile Health</CardTitle>
            <Search className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCompleteness?.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Completeness score</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Trends */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>Candidate Activity Trends (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="jobsViewed" stroke="hsl(var(--chart-1))" name="Jobs Viewed" />
              <Line type="monotone" dataKey="applicationsSubmitted" stroke="hsl(var(--chart-2))" name="Applications" />
              <Line type="monotone" dataKey="searchQueries" stroke="hsl(var(--chart-3))" name="Searches" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Application Funnel */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>Application Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {funnelData.map((stage, index) => (
              <div key={stage.stage} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stage.stage}</span>
                  <span className="text-muted-foreground">
                    {stage.count} ({stage.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-8 bg-muted/20 rounded-lg overflow-hidden">
                  <div 
                    className="h-full flex items-center px-3 text-xs font-medium text-white transition-all"
                    style={{ 
                      width: `${stage.percentage}%`,
                      backgroundColor: `hsl(var(--chart-${index + 1}))`,
                    }}
                  >
                    {stage.count > 0 && `${stage.count}`}
                  </div>
                </div>
                {index < funnelData.length - 1 && (
                  <div className="text-xs text-muted-foreground text-right">
                    Drop-off: {((funnelData[index].count - funnelData[index + 1].count) / funnelData[index].count * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
