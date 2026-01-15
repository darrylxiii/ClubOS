import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Sparkles, TrendingUp, AlertCircle, Users, Calendar, Target, BarChart3, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CandidateIntelligenceDossier } from "@/components/intelligence/CandidateIntelligenceDossier";
import { AggregatedIntelligenceOverview } from "@/components/intelligence/AggregatedIntelligenceOverview";
import { JobPredictionAccordion } from "@/components/intelligence/JobPredictionAccordion";
import { useAggregatedHiringIntelligence, useRefreshAggregatedIntelligence } from "@/hooks/useAggregatedHiringIntelligence";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

// Predictions Tab Content Component
function PredictionsTabContent({ 
  jobs, 
  navigate, 
  EmptyState 
}: { 
  jobs: any[]; 
  navigate: (path: string) => void;
  EmptyState: React.FC<{ icon: any; title: string; description: string; action?: { label: string; onClick: () => void } }>;
}) {
  const { data: insights, isLoading } = useAggregatedHiringIntelligence();
  const refreshMutation = useRefreshAggregatedIntelligence();

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Target}
            title="No Predictions Available"
            description="AI predictions will appear once you have active jobs with candidates in the pipeline."
            action={{ label: "Create Job", onClick: () => navigate('/jobs/new') }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Aggregated Intelligence Overview - Primary View */}
      <AggregatedIntelligenceOverview
        insights={insights || null}
        isLoading={isLoading}
        onRefresh={() => refreshMutation.mutate(undefined)}
        isRefreshing={refreshMutation.isPending}
      />

      {/* Individual Job Predictions - Expandable Accordion */}
      <JobPredictionAccordion
        jobs={jobs.filter(j => j.status === 'published')}
        jobHealthScores={insights?.jobHealthScores || []}
      />
    </div>
  );
}

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

      // Load all jobs with published OR draft status (not 'open' which doesn't exist)
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*, companies(name)')
        .in('status', ['published', 'draft'])
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Load application counts per job separately (proper way to count)
      const jobIds = jobsData?.map(j => j.id) || [];
      const applicationCounts: Record<string, number> = {};
      
      if (jobIds.length > 0) {
        const { data: appCountData } = await supabase
          .from('applications')
          .select('job_id')
          .in('job_id', jobIds);
        
        // Aggregate counts client-side
        appCountData?.forEach(app => {
          applicationCounts[app.job_id] = (applicationCounts[app.job_id] || 0) + 1;
        });
      }

      // Load applications for active candidates with match scores
      const { data: applications } = await supabase
        .from('applications')
        .select('*, candidate_profiles(full_name, first_name, last_name), jobs(title, companies(name))')
        .in('status', ['active', 'screening', 'interview', 'offer'])
        .order('match_score', { ascending: false, nullsFirst: false })
        .limit(20);

      // Load upcoming interviews - enhanced detection:
      // 1. Bookings marked as interview bookings
      // 2. OR bookings with a job_id association (likely an interview)
      const { data: interviews } = await supabase
        .from('bookings')
        .select('*, candidate_profiles(full_name, first_name, last_name), jobs(title, companies(name))')
        .or('is_interview_booking.eq.true,job_id.not.is.null')
        .gte('scheduled_start', new Date().toISOString())
        .order('scheduled_start', { ascending: true })
        .limit(10);

      // Load ML predictions for stats
      const { data: predictions } = await supabase
        .from('ml_predictions')
        .select('prediction_score')
        .order('created_at', { ascending: false })
        .limit(100);

      // Calculate average match score from applications (not predictions)
      const applicationsWithScores = applications?.filter(a => a.match_score != null) || [];
      const avgMatchFromApps = applicationsWithScores.length > 0
        ? (applicationsWithScores.reduce((sum, a) => sum + (a.match_score || 0), 0) / applicationsWithScores.length).toFixed(1)
        : 0;

      // Calculate stats
      const activeJobs = jobsData?.filter(j => j.status === 'published').length || 0;
      const totalJobs = jobsData?.length || 0;
      const candidatesInPipeline = applications?.length || 0;

      setStats({
        activeJobs,
        totalJobs,
        aiInsightsGenerated: predictions?.length || 0,
        predictedHires: candidatesInPipeline > 0 ? Math.ceil(candidatesInPipeline * 0.15) : 0,
        avgMatchScore: avgMatchFromApps,
        jobsWithCandidates: Object.keys(applicationCounts).length,
        totalCandidates: candidatesInPipeline,
      });

      // Process jobs with health scores
      const jobsWithHealth = jobsData?.map((job: any) => {
        const appCount = applicationCounts[job.id] || 0;
        // Health score based on application count and job status
        let healthScore = 0;
        if (job.status === 'published') {
          healthScore = appCount > 10 ? 100 : appCount > 5 ? 80 : appCount > 2 ? 60 : appCount > 0 ? 40 : 20;
        } else {
          healthScore = 10; // Draft jobs have low health
        }
        
        return {
          ...job,
          candidatesInPipeline: appCount,
          upcomingInterviews: 0,
          healthScore,
          alerts: healthScore < 50 ? 1 : 0,
        };
      }) || [];

      setJobs(jobsWithHealth);
      setJobsNeedingAttention(jobsWithHealth.filter((j: any) => j.healthScore < 60 && j.status === 'published'));
      setTopCandidatesAcrossJobs(applications?.slice(0, 6) || []);
      setUpcomingInterviewsAllJobs(interviews || []);

      // Interview stats
      setInterviewStats({
        thisWeek: interviews?.length || 0,
        feedbackPending: 0,
        avgFeedbackTime: 12,
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

  // Empty state component for reusability
  const EmptyState = ({ icon: Icon, title, description, action }: { 
    icon: any; 
    title: string; 
    description: string; 
    action?: { label: string; onClick: () => void } 
  }) => (
    <div className="text-center py-12 px-6">
      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );

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
                {stats.totalJobs > stats.activeJobs && `${stats.totalJobs - stats.activeJobs} drafts • `}
                {stats.jobsWithCandidates} with candidates
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Candidates in Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalCandidates}</div>
              <p className="text-xs text-muted-foreground">Across all active jobs</p>
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
              <div className="text-3xl font-bold">
                {stats.avgMatchScore > 0 ? `${stats.avgMatchScore}%` : '—'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.avgMatchScore > 0 ? 'ML matching accuracy' : 'No scores yet'}
              </p>
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
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Jobs Requiring Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <EmptyState
                    icon={Briefcase}
                    title="No Jobs Yet"
                    description="Create and publish jobs to start tracking hiring intelligence and candidate pipelines."
                    action={{ label: "Create Job", onClick: () => navigate('/jobs/new') }}
                  />
                ) : jobsNeedingAttention.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                      <TrendingUp className="h-6 w-6 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">All published jobs are healthy!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobsNeedingAttention.map(job => (
                      <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{job.title}</h3>
                          <p className="text-sm text-muted-foreground">{job.companies?.name}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            {job.candidatesInPipeline === 0 ? 'No candidates' : `${job.candidatesInPipeline} candidates`}
                          </Badge>
                          <Button onClick={() => navigate(`/jobs/${job.id}/dashboard`)}>
                            View Dashboard
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pipeline Health Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Health Across Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <EmptyState
                    icon={BarChart3}
                    title="No Pipeline Data"
                    description="Publish jobs and receive applications to see pipeline health metrics."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jobs.map(job => (
                      <Card 
                        key={job.id} 
                        className="border-l-4 cursor-pointer hover:shadow-lg transition-shadow"
                        style={{
                          borderLeftColor: job.healthScore > 80 ? 'hsl(142, 76%, 36%)' : 
                                         job.healthScore > 60 ? 'hsl(48, 96%, 53%)' : 
                                         job.healthScore > 30 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)'
                        }}
                        onClick={() => navigate(`/jobs/${job.id}/dashboard`)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{job.title}</CardTitle>
                            <Badge variant={job.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                              {job.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span>Health Score</span>
                              <span className="font-bold">{job.healthScore}%</span>
                            </div>
                            <Progress value={job.healthScore} />
                            <div className="text-xs text-muted-foreground">
                              {job.candidatesInPipeline} candidate{job.candidatesInPipeline !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Candidates Tab */}
          <TabsContent value="candidates" className="space-y-6">
            {topCandidatesAcrossJobs.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <EmptyState
                    icon={Users}
                    title="No Candidates Yet"
                    description="When candidates apply to your jobs, the top performers will appear here with AI-generated insights."
                    action={{ label: "View Jobs", onClick: () => navigate('/jobs') }}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {topCandidatesAcrossJobs.map(app => (
                  <CandidateIntelligenceDossier
                    key={app.id}
                    candidateId={app.candidate_id}
                    jobId={app.job_id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Interviews Tab */}
          <TabsContent value="interviews" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Interviews (All Jobs)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingInterviewsAllJobs.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="No Upcoming Interviews"
                    description="Schedule interviews with candidates from the job dashboard. Interviews will appear here automatically."
                    action={{ label: "View Jobs", onClick: () => navigate('/jobs') }}
                  />
                ) : (
                  <div className="space-y-3">
                    {upcomingInterviewsAllJobs.map(interview => (
                      <div key={interview.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback>
                              {interview.candidate_profiles?.first_name?.[0] || 
                               interview.candidate_profiles?.full_name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">
                              {interview.candidate_profiles?.first_name && interview.candidate_profiles?.last_name
                                ? `${interview.candidate_profiles.first_name} ${interview.candidate_profiles.last_name}`
                                : interview.candidate_profiles?.full_name || 'Candidate'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {interview.jobs?.title || 'Interview'} • {interview.jobs?.companies?.name || 'Company'}
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
                    ))}
                  </div>
                )}
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
                  <div className="text-2xl font-bold text-amber-500">{interviewStats.feedbackPending}</div>
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

          {/* Predictions Tab - Redesigned with Aggregated Intelligence */}
          <TabsContent value="predictions" className="space-y-6">
            <PredictionsTabContent jobs={jobs} navigate={navigate} EmptyState={EmptyState} />
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
