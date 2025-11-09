import { memo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAssessmentAnalytics } from '@/hooks/useAssessmentAnalytics';
import { useAssessmentAssignments } from '@/hooks/useAssessmentAssignments';
import { BarChart, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const AssessmentOverviewTab = memo(() => {
  const { getOverviewStats, loading: analyticsLoading } = useAssessmentAnalytics();
  const { getAssignments } = useAssessmentAssignments();
  const [stats, setStats] = useState({
    totalAttempts: 0,
    totalCompletions: 0,
    avgCompletionRate: 0,
    avgScore: 0,
    pendingAssignments: 0,
    completedToday: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const overviewStats = getOverviewStats();
    const { data: assignments } = await getAssignments();
    
    const pending = assignments?.filter(a => a.status === 'pending').length || 0;
    const completedToday = assignments?.filter(a => {
      if (!a.completed_at) return false;
      const today = new Date().toDateString();
      return new Date(a.completed_at).toDateString() === today;
    }).length || 0;

    setStats({
      ...overviewStats,
      pendingAssignments: pending,
      completedToday,
    });
  };

  if (analyticsLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttempts}</div>
            <p className="text-xs text-muted-foreground">All time assessments started</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">Average across all assessments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore}%</div>
            <p className="text-xs text-muted-foreground">Platform-wide average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingAssignments} pending</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assessment Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Detailed charts and trends coming soon. Use the other tabs to send assessments and view detailed results.
          </p>
        </CardContent>
      </Card>
    </div>
  );
});

AssessmentOverviewTab.displayName = 'AssessmentOverviewTab';
