import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Sparkles, TrendingUp, AlertCircle, Users, Calendar, Target, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PredictiveAnalyticsDashboard } from "@/components/intelligence/PredictiveAnalyticsDashboard";
import { CandidateIntelligenceDossier } from "@/components/intelligence/CandidateIntelligenceDossier";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

export default function HiringIntelligenceHub() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({ activeJobs: 0, aiInsightsGenerated: 0, predictedHires: 0, avgMatchScore: 0 });
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsNeedingAttention, setJobsNeedingAttention] = useState<any[]>([]);
  const [topCandidatesAcrossJobs, setTopCandidatesAcrossJobs] = useState<any[]>([]);
  const [upcomingInterviewsAllJobs, setUpcomingInterviewsAllJobs] = useState<any[]>([]);
  const [interviewStats, setInterviewStats] = useState<any>({ thisWeek: 0, feedbackPending: 0, avgFeedbackTime: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*, companies(name), applications(count)')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Load applications for active candidates
      const { data: applications } = await supabase
        .from('applications')
        .select('*, candidate_profiles(*)')
        .eq('status', 'active')
        .order('match_score', { ascending: false })
        .limit(20);

      // Load upcoming interviews
      const { data: interviews } = await supabase
        .from('bookings')
        .select('*, candidate_profiles(full_name), jobs(title, companies(name))')
        .eq('is_interview_booking', true)
        .gte('scheduled_start', new Date().toISOString())
        .order('scheduled_start', { ascending: true })
        .limit(10);

      // Load ML predictions for stats
      const { data: predictions } = await supabase
        .from('ml_predictions')
        .select('prediction_score')
        .order('created_at', { ascending: false })
        .limit(100);

      // Calculate stats
      const activeJobs = jobsData?.length || 0;
      const candidatesInPipeline = applications?.length || 0;
      const avgMatch = predictions?.length > 0 
        ? (predictions.reduce((sum, p) => sum + p.prediction_score, 0) / predictions.length * 100).toFixed(1)
        : 0;

      setStats({
        activeJobs,
        aiInsightsGenerated: predictions?.length || 0,
        predictedHires: Math.ceil(candidatesInPipeline * 0.15), // Estimate 15% hire rate
        avgMatchScore: avgMatch,
        jobsWithCandidates: jobsData?.filter((j: any) => j.applications && j.applications.length > 0).length || 0,
      });

      // Process jobs with health scores
      const jobsWithHealth = jobsData?.map((job: any) => {
        const appCount = job.applications?.length || 0;
        const healthScore = appCount > 0 ? Math.min(100, appCount * 10) : 0;
        return {
          ...job,
          candidatesInPipeline: appCount,
          upcomingInterviews: 0, // Would need to calculate from bookings
          healthScore,
          alerts: healthScore < 50 ? 1 : 0,
        };
      }) || [];

      setJobs(jobsWithHealth);
      setJobsNeedingAttention(jobsWithHealth.filter((j: any) => j.healthScore < 60));
      setTopCandidatesAcrossJobs(applications?.slice(0, 6) || []);
      setUpcomingInterviewsAllJobs(interviews || []);

      // Interview stats
      setInterviewStats({
        thisWeek: interviews?.length || 0,
        feedbackPending: 0, // Would need to calculate
        avgFeedbackTime: 12, // Placeholder
      });

    } catch (error) {
      console.error('Error loading intelligence data:', error);
      toast.error("Failed to load intelligence data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <p className="text-center text-muted-foreground">Loading intelligence hub...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Hero Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Brain className="h-10 w-10 text-primary" />
              Hiring Intelligence Hub
            </h1>
            <p className="text-muted-foreground mt-2">
              AI-powered insights across all your hiring activities
            </p>
          </div>
          <Button onClick={() => navigate('/ml-dashboard')}>
            <Sparkles className="h-4 w-4 mr-2" />
            View ML Engine
          </Button>
        </div>

        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Active Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeJobs}</div>
              <p className="text-xs text-muted-foreground">
                {stats.jobsWithCandidates} with active candidates
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">AI Insights Generated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.aiInsightsGenerated}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Predicted Hires</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.predictedHires}</div>
              <p className="text-xs text-muted-foreground">Next 30 days (AI forecast)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Avg Match Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.avgMatchScore}%</div>
              <p className="text-xs text-muted-foreground">ML matching accuracy</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="candidates">Top Candidates</TabsTrigger>
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Jobs Requiring Attention */}
            <Card>
              <CardHeader>
                <CardTitle>Jobs Requiring Attention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {jobsNeedingAttention.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      All jobs are healthy! 🎉
                    </p>
                  ) : (
                    jobsNeedingAttention.map(job => (
                      <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{job.title}</h3>
                          <p className="text-sm text-muted-foreground">{job.companies?.name}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="destructive">{job.alerts} alert{job.alerts !== 1 ? 's' : ''}</Badge>
                          <Button onClick={() => navigate(`/jobs/${job.id}/dashboard`)}>
                            View Dashboard
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Health Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Health Across Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {jobs.map(job => (
                    <Card 
                      key={job.id} 
                      className="border-l-4 cursor-pointer hover:shadow-lg transition-shadow"
                      style={{
                        borderLeftColor: job.healthScore > 80 ? 'hsl(var(--success))' : 
                                       job.healthScore > 60 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'
                      }}
                      onClick={() => navigate(`/jobs/${job.id}/dashboard`)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{job.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Health Score</span>
                            <span className="font-bold">{job.healthScore}%</span>
                          </div>
                          <Progress value={job.healthScore} />
                          <div className="text-xs text-muted-foreground">
                            {job.candidatesInPipeline} candidates • {job.upcomingInterviews} interviews
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Candidates Tab */}
          <TabsContent value="candidates" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {topCandidatesAcrossJobs.map(app => (
                <CandidateIntelligenceDossier
                  key={app.id}
                  candidateId={app.candidate_id}
                  jobId={app.job_id}
                />
              ))}
            </div>
          </TabsContent>

          {/* Interviews Tab */}
          <TabsContent value="interviews" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Interviews (All Jobs)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingInterviewsAllJobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No upcoming interviews scheduled
                    </p>
                  ) : (
                    upcomingInterviewsAllJobs.map(interview => (
                      <div key={interview.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback>
                              {interview.candidate_profiles?.full_name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{interview.candidate_profiles?.full_name || 'Candidate'}</h3>
                            <p className="text-sm text-muted-foreground">
                              {interview.jobs?.title} • {interview.jobs?.companies?.name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {format(new Date(interview.scheduled_start), 'MMM d, h:mm a')}
                          </p>
                          <p className="text-xs text-muted-foreground">{interview.meeting_type || 'Interview'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Interview Performance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{interviewStats.thisWeek}</div>
                  <p className="text-xs text-muted-foreground">Scheduled interviews</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Feedback Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-500">{interviewStats.feedbackPending}</div>
                  <p className="text-xs text-muted-foreground">Awaiting submission</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Avg Feedback Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{interviewStats.avgFeedbackTime}h</div>
                  <p className="text-xs text-muted-foreground">Target: &lt;24h</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6">
            {jobs.map(job => (
              <PredictiveAnalyticsDashboard key={job.id} jobId={job.id} />
            ))}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Machine Learning Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  View detailed ML model performance and matching engine metrics
                </p>
                <Button onClick={() => navigate('/ml-dashboard')} variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Full ML Dashboard
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
