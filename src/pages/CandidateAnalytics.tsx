import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCandidateAnalytics } from "@/hooks/useCandidateAnalytics";
import { useAuth as useSupabaseAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Eye, FileText, Briefcase, Award, TrendingUp, Users, Download, Search, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCSV } from "@/utils/analyticsExport";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";

export default function CandidateAnalytics() {
  const { user } = useSupabaseAuth();
  const { data, loading } = useCandidateAnalytics(user?.id);

  const handleExport = () => {
    if (!data) return;
    
    const exportData = {
      profile_views: data.profileViews.total,
      unique_viewers: data.profileViews.unique,
      total_applications: data.applicationMetrics.total,
      active_applications: data.applicationMetrics.active,
      interviews: data.applicationMetrics.interviews,
      offers: data.applicationMetrics.offers,
      success_rate: data.applicationMetrics.successRate,
      avg_rating: data.interviewPerformance.avgRating,
      cv_downloads: data.documentEngagement.cvDownloads,
      referrals_made: data.networkActivity.referralsMade,
      referrals_hired: data.networkActivity.referralsHired,
    };

    exportToCSV([exportData], 'candidate-analytics');
    toast.success('Analytics exported successfully');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!data) return null;

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  const interviewRadarData = [
    { skill: 'Rating', value: data.interviewPerformance.avgRating * 20 },
    { skill: 'Technical', value: data.interviewPerformance.avgTechnicalScore * 20 },
    { skill: 'Culture Fit', value: data.interviewPerformance.avgCulturalFit * 20 },
    { skill: 'Communication', value: data.interviewPerformance.avgCommunication * 20 },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your Career Analytics</h1>
            <p className="text-muted-foreground">Track your job search performance and insights</p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Eye className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.profileViews.total}</p>
                  <p className="text-sm text-muted-foreground">Profile Views</p>
                  <p className="text-xs text-muted-foreground">{data.profileViews.unique} unique</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.applicationMetrics.total}</p>
                  <p className="text-sm text-muted-foreground">Applications</p>
                  <p className="text-xs text-muted-foreground">{data.applicationMetrics.active} active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.applicationMetrics.interviews}</p>
                  <p className="text-sm text-muted-foreground">Interviews</p>
                  <p className="text-xs text-muted-foreground">{data.interviewPerformance.completed} completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.applicationMetrics.successRate}%</p>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-xs text-muted-foreground">{data.applicationMetrics.offers} offers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto min-h-[44px]">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
            <TabsTrigger value="search">Job Search</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Views Trend</CardTitle>
                  <CardDescription>Daily profile views over the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.profileViews.trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Companies Viewing You</CardTitle>
                  <CardDescription>Companies that viewed your profile most</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.profileViews.byCompany.slice(0, 5).map((company, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm">{company.company}</span>
                        <span className="text-sm font-bold">{company.views} views</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Document Engagement</CardTitle>
                <CardDescription>How recruiters interact with your documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Download className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{data.documentEngagement.cvDownloads}</p>
                    <p className="text-sm text-muted-foreground">CV Downloads</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Eye className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{data.documentEngagement.portfolioViews}</p>
                    <p className="text-sm text-muted-foreground">Portfolio Views</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <FileText className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{data.documentEngagement.documentsShared}</p>
                    <p className="text-sm text-muted-foreground">Docs Shared</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Application Timeline</CardTitle>
                  <CardDescription>Your application activity over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.applicationMetrics.timeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="applications" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Applications by Stage</CardTitle>
                  <CardDescription>Current distribution of your applications</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.applicationMetrics.byStage}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="interviews" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Interview Performance</CardTitle>
                  <CardDescription>Your average scores across different dimensions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={interviewRadarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="skill" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Interview Metrics</CardTitle>
                  <CardDescription>Overall interview statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total Interviews</span>
                      <span className="font-bold">{data.interviewPerformance.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Completed</span>
                      <span className="font-bold">{data.interviewPerformance.completed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average Rating</span>
                      <span className="font-bold">{data.interviewPerformance.avgRating.toFixed(2)}/5</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>No-Show Rate</span>
                      <span className="font-bold">{data.interviewPerformance.noShowRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Job Search Behavior</CardTitle>
                <CardDescription>What you're looking for</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Top Search Terms</h4>
                    <div className="space-y-2">
                      {data.jobSearchBehavior.topSearchTerms.slice(0, 5).map((term, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-sm">{term.term}</span>
                          <span className="text-sm font-bold">{term.count} searches</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      <Search className="inline h-4 w-4 mr-1" />
                      Total searches: <strong>{data.jobSearchBehavior.totalSearches}</strong>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-3xl font-bold">{data.networkActivity.referralsMade}</p>
                    <p className="text-sm text-muted-foreground">Referrals Made</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-3xl font-bold">{data.networkActivity.referralsHired}</p>
                    <p className="text-sm text-muted-foreground">Referrals Hired</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-3xl font-bold">€{data.networkActivity.rewardsEarned}</p>
                    <p className="text-sm text-muted-foreground">Rewards Earned</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
