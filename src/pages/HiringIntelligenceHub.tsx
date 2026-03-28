import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Sparkles, TrendingUp, AlertCircle, Users, Calendar, Target, BarChart3, Briefcase, FileText, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useHiringIntelligenceData } from "@/hooks/useHiringIntelligenceData";
import type { JobWithHealth, CandidateApplication, UpcomingInterview } from "@/hooks/useHiringIntelligenceData";
import { CandidateIntelligenceDossier } from "@/components/intelligence/CandidateIntelligenceDossier";
import { AggregatedIntelligenceOverview } from "@/components/intelligence/AggregatedIntelligenceOverview";
import { JobPredictionAccordion } from "@/components/intelligence/JobPredictionAccordion";
import { useAggregatedHiringIntelligence, useRefreshAggregatedIntelligence } from "@/hooks/useAggregatedHiringIntelligence";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

// Predictions Tab Content Component
function PredictionsTabContent({  jobs, 
  navigate, 
  EmptyState 
}: { 
  jobs: JobWithHealth[]; 
  navigate: (path: string) => void;
  EmptyState: React.FC<{ icon: React.ElementType; title: string; description: string; action?: { label: string; onClick: () => void } }>;
}) {
const { t } = useTranslation('common');
  const { data: insights, isLoading } = useAggregatedHiringIntelligence();
  const refreshMutation = useRefreshAggregatedIntelligence();

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Target}
            title={t("no_predictions_available", "No Predictions Available")}
            description={t("no_predictions_desc", "AI predictions will appear once you have active jobs with candidates in the pipeline.")}
            action={{ label: t('create_job', 'Create Job'), onClick: () => navigate('/jobs/new') }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <AggregatedIntelligenceOverview
        insights={insights || null}
        isLoading={isLoading}
        onRefresh={() => refreshMutation.mutate(undefined)}
        isRefreshing={refreshMutation.isPending}
      />
      <JobPredictionAccordion
        jobs={jobs.filter(j => j.status === 'published')}
        jobHealthScores={insights?.jobHealthScores || []}
      />
    </div>
  );
}

export default function HiringIntelligenceHub({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { data, isLoading: loading, error } = useHiringIntelligenceData();

  const stats = data?.stats ?? { activeJobs: 0, aiInsightsGenerated: 0, predictedHires: 0, avgMatchScore: 0 };
  const jobs = data?.jobs ?? [];
  const jobsNeedingAttention = data?.jobsNeedingAttention ?? [];
  const topCandidatesAcrossJobs = data?.topCandidates ?? [];
  const upcomingInterviewsAllJobs = data?.upcomingInterviews ?? [];
  const interviewStats = data?.interviewStats ?? { thisWeek: 0, feedbackPending: 0, avgFeedbackTime: 0 };

  const Wrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>;

  if (loading) {
    return (
      <Wrapper>
        <div className="container mx-auto py-6">
          <p className="text-center text-muted-foreground">{t('hiringIntelligenceHub.loading', 'Loading intelligence hub...')}</p>
        </div>
      </Wrapper>
    );
  }

  // Empty state component for reusability
  const EmptyState = ({ icon: Icon, title, description, action }: { 
    icon: React.ElementType; 
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
    <Wrapper>
      <div className="container mx-auto py-6 space-y-6">
        {/* Hero Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Brain className="h-10 w-10 text-primary" />
              {t('hiringIntelligenceHub.title', 'Hiring Intelligence Hub')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('hiringIntelligenceHub.subtitle', 'AI-powered insights across all your hiring activities')}
            </p>
          </div>
          <Button onClick={() => navigate('/ml-dashboard')}>
            <Sparkles className="h-4 w-4 mr-2" />
            {t('hiringIntelligenceHub.viewMlEngine', 'View ML Engine')}
          </Button>
        </div>

        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{t("active_jobs", "Active Jobs")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeJobs}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalJobs > stats.activeJobs && `${stats.totalJobs - stats.activeJobs} drafts • `}
                {t('hiringIntelligenceHub.withCandidates', '{{count}} with candidates', { count: stats.jobsWithCandidates })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{t("candidates_in_pipeline", "Candidates in Pipeline")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalCandidates}</div>
              <p className="text-xs text-muted-foreground">{t("across_all_active_jobs", "Across all active jobs")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{t("predicted_hires", "Predicted Hires")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.predictedHires}</div>
              <p className="text-xs text-muted-foreground">{t("next_30_days_ai", "Next 30 days (AI forecast)")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{t("avg_match_score", "Avg Match Score")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats.avgMatchScore > 0 ? `${stats.avgMatchScore}%` : '—'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.avgMatchScore > 0 ? t('hiringIntelligenceHub.mlMatchingAccuracy', 'ML matching accuracy') : t('hiringIntelligenceHub.noScoresYet', 'No scores yet')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">{t("overview", "Overview")}</TabsTrigger>
            <TabsTrigger value="candidates">{t("top_candidates", "Top Candidates")}</TabsTrigger>
            <TabsTrigger value="interviews">{t("interviews", "Interviews")}</TabsTrigger>
            <TabsTrigger value="predictions">{t("predictions", "Predictions")}</TabsTrigger>
            <TabsTrigger value="performance">{t("performance", "Performance")}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Jobs Requiring Attention */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  {t('hiringIntelligenceHub.jobsRequiringAttention', 'Jobs Requiring Attention')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <EmptyState
                    icon={Briefcase}
                    title={t("no_jobs_yet", "No Jobs Yet")}
                    description={t('hiringIntelligenceHub.noJobsDesc', 'Create and publish jobs to start tracking hiring intelligence and candidate pipelines.')}
                    action={{ label: t('create_job', 'Create Job'), onClick: () => navigate('/jobs/new') }}
                  />
                ) : jobsNeedingAttention.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                      <TrendingUp className="h-6 w-6 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">{t("all_published_jobs_are", "All published jobs are healthy!")}</p>
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
                            {job.candidatesInPipeline === 0 ? t('hiringIntelligenceHub.noCandidates', 'No candidates') : t('hiringIntelligenceHub.candidateCount', '{{count}} candidates', { count: job.candidatesInPipeline })}
                          </Badge>
                          <Button onClick={() => navigate(`/jobs/${job.id}/dashboard`)}>
                            {t('hiringIntelligenceHub.viewDashboard', 'View Dashboard')}
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
                <CardTitle>{t("pipeline_health_across_jobs", "Pipeline Health Across Jobs")}</CardTitle>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <EmptyState
                    icon={BarChart3}
                    title={t("no_pipeline_data", "No Pipeline Data")}
                    description={t("publish_jobs_and_receive", "Publish jobs and receive applications to see pipeline health metrics.")}
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
                              <span>{t("health_score", "Health Score")}</span>
                              <span className="font-bold">{job.healthScore}%</span>
                            </div>
                            <Progress value={job.healthScore} />
                            <div className="text-xs text-muted-foreground">
                              {t('hiringIntelligenceHub.candidateCount', '{{count}} candidates', { count: job.candidatesInPipeline })}
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
                    title={t("no_candidates_yet", "No Candidates Yet")}
                    description={t('hiringIntelligenceHub.noCandidatesDesc', 'When candidates apply to your jobs, the top performers will appear here with AI-generated insights.')}
                    action={{ label: t('view_jobs', 'View Jobs'), onClick: () => navigate('/jobs') }}
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
                  {t('hiringIntelligenceHub.upcomingInterviews', 'Upcoming Interviews (All Jobs)')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingInterviewsAllJobs.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title={t("no_upcoming_interviews", "No Upcoming Interviews")}
                    description={t('hiringIntelligenceHub.noInterviewsDesc', 'Schedule interviews with candidates from the job dashboard. Interviews will appear here automatically.')}
                    action={{ label: t('view_jobs', 'View Jobs'), onClick: () => navigate('/jobs') }}
                  />
                ) : (
                  <div className="space-y-3">
                    {upcomingInterviewsAllJobs.map(interview => (
                      <div key={interview.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback>
                              {interview.candidate_profiles?.full_name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">
                              {interview.candidate_profiles?.full_name || 'Candidate'}
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
                  <CardTitle className="text-sm text-muted-foreground">{t("this_week", "This Week")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{interviewStats.thisWeek}</div>
                  <p className="text-xs text-muted-foreground">{t("scheduled_interviews", "Scheduled interviews")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">{t("feedback_pending", "Feedback Pending")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-500">{interviewStats.feedbackPending}</div>
                  <p className="text-xs text-muted-foreground">{t("awaiting_submission", "Awaiting submission")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">{t("avg_feedback_time", "Avg Feedback Time")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{interviewStats.avgFeedbackTime}h</div>
                  <p className="text-xs text-muted-foreground">{t("target_lt24h", "Target: &lt;24h")}</p>
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
                  {t('hiringIntelligenceHub.mlInsights', 'Machine Learning Insights')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('hiringIntelligenceHub.mlInsightsDesc', 'View detailed ML model performance and matching engine metrics')}
                </p>
                <Button onClick={() => navigate('/ml-dashboard')} variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {t('hiringIntelligenceHub.viewFullMlDashboard', 'View Full ML Dashboard')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Wrapper>
  );
}
