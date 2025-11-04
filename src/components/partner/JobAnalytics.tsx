// Phase 2: Job-Specific Analytics Component
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useJobAnalytics } from "@/hooks/useJobAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Clock, Users, Target, Zap, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface JobAnalyticsProps {
  jobId: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--secondary))'];

export const JobAnalytics = ({ jobId }: JobAnalyticsProps) => {
  const { data, loading, error } = useJobAnalytics(jobId);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-muted-foreground">Failed to load analytics: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare sourcing data for pie chart
  const sourcingData = [
    { name: 'Club Sync', value: data.sourcing.clubSync },
    { name: 'Direct Apply', value: data.sourcing.directApply },
    { name: 'Referrals', value: data.sourcing.referrals },
    { name: 'Other', value: data.sourcing.other },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalApplications}</p>
                <p className="text-sm text-muted-foreground">Total Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.activeApplications}</p>
                <p className="text-sm text-muted-foreground">Active</p>
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
                <p className="text-2xl font-bold">{data.totalHires}</p>
                <p className="text-sm text-muted-foreground">Hires</p>
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
                <p className="text-2xl font-bold">{data.timeMetrics.totalTimeToHire}d</p>
                <p className="text-sm text-muted-foreground">Avg Time to Hire</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sourcing Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Sourcing Breakdown
          </CardTitle>
          <CardDescription>Where candidates are coming from</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourcingData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sourcingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <span className="font-medium">Club Sync</span>
                <Badge>{data.sourcing.clubSync}</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <span className="font-medium">Direct Apply</span>
                <Badge>{data.sourcing.directApply}</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <span className="font-medium">Referrals</span>
                <Badge>{data.sourcing.referrals}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Stage Conversion Rates</CardTitle>
          <CardDescription>How candidates progress through your pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.pipelinePerformance.stageConversions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="from" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="rate" fill="hsl(var(--primary))" name="Conversion Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Time Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Average Time per Stage</CardTitle>
          <CardDescription>Days candidates spend in each stage</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.timeMetrics.avgTimeInStages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgDays" fill="hsl(var(--accent))" name="Avg Days" />
            </BarChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Fastest Hire</p>
              <p className="text-2xl font-bold">{data.timeMetrics.fastestHire}d</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Average</p>
              <p className="text-2xl font-bold">{data.timeMetrics.totalTimeToHire}d</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Slowest Hire</p>
              <p className="text-2xl font-bold">{data.timeMetrics.slowestHire}d</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hiring Velocity */}
      <Card>
        <CardHeader>
          <CardTitle>Applications Over Time</CardTitle>
          <CardDescription>Application volume trends</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.hiringVelocity.applicationsPerWeek}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2} 
                name="Applications"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Candidate Quality */}
      <Card>
        <CardHeader>
          <CardTitle>Candidate Quality Metrics</CardTitle>
          <CardDescription>Quality indicators for this role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Avg Fit Score</p>
              <p className="text-3xl font-bold">{data.candidateQuality.avgFitScore}%</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Engagement Rate</p>
              <p className="text-3xl font-bold">{data.candidateQuality.avgEngagementRate}%</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Interview Pass</p>
              <p className="text-3xl font-bold">{data.candidateQuality.interviewPassRate}%</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Offer Acceptance</p>
              <p className="text-3xl font-bold">{data.candidateQuality.offerAcceptanceRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
