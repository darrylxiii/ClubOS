import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useCRMActivities } from '@/hooks/useCRMActivities';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { CRMActivity } from '@/types/crm-activities';

interface AnalyticsMetric {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

export function ActivityAnalyticsDashboard() {
  const { activities: allActivities, loading } = useCRMActivities({ limit: 500 });

  const analytics = useMemo(() => {
    if (!allActivities || allActivities.length === 0) {
      return {
        completionRate: 0,
        completedToday: 0,
        overdueCount: 0,
        byType: {},
        teamLeaderboard: [],
        monthlyTrend: [],
      };
    }

    // Overall completion rate
    const completed = allActivities.filter(a => a.is_done).length;
    const completionRate = allActivities.length > 0 ? (completed / allActivities.length) * 100 : 0;

    // Completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = allActivities.filter(a => {
      if (!a.done_at) return false;
      const doneDate = new Date(a.done_at);
      doneDate.setHours(0, 0, 0, 0);
      return doneDate.getTime() === today.getTime();
    }).length;

    // Overdue count
    const now = new Date();
    const overdueCount = allActivities.filter(a => {
      if (a.is_done) return false;
      if (!a.due_date) return false;
      return new Date(a.due_date) < now;
    }).length;

    // By activity type
    const byType: Record<string, { count: number; completed: number }> = {};
    allActivities.forEach(a => {
      if (!byType[a.activity_type]) {
        byType[a.activity_type] = { count: 0, completed: 0 };
      }
      byType[a.activity_type].count++;
      if (a.is_done) {
        byType[a.activity_type].completed++;
      }
    });

    // Team leaderboard (by owner)
    const byOwner: Record<string, { name: string; completed: number; total: number }> = {};
    allActivities.forEach(a => {
      const ownerKey = a.owner_name || 'Unassigned';
      if (!byOwner[ownerKey]) {
        byOwner[ownerKey] = { name: ownerKey, completed: 0, total: 0 };
      }
      byOwner[ownerKey].total++;
      if (a.is_done) {
        byOwner[ownerKey].completed++;
      }
    });

    const teamLeaderboard = Object.values(byOwner)
      .map(owner => ({
        ...owner,
        rate: owner.total > 0 ? (owner.completed / owner.total) * 100 : 0,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);

    // Monthly trend (last 30 days)
    const now30 = new Date();
    const monthStart = startOfMonth(now30);
    const monthEnd = endOfMonth(now30);

    const monthlyTrend: Array<{ date: string; completed: number; total: number }> = [];
    const dailyStats: Record<string, { completed: number; total: number }> = {};

    allActivities.forEach(a => {
      const createdDate = new Date(a.created_at);
      if (isWithinInterval(createdDate, { start: monthStart, end: monthEnd })) {
        const dateKey = format(createdDate, 'MMM d');
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = { completed: 0, total: 0 };
        }
        dailyStats[dateKey].total++;
        if (a.is_done) {
          dailyStats[dateKey].completed++;
        }
      }
    });

    Object.entries(dailyStats)
      .sort()
      .slice(-14)
      .forEach(([date, stats]) => {
        monthlyTrend.push({ date, ...stats });
      });

    return {
      completionRate,
      completedToday,
      overdueCount,
      byType,
      teamLeaderboard,
      monthlyTrend,
    };
  }, [allActivities]);

  const metrics: AnalyticsMetric[] = [
    {
      label: 'Completion Rate',
      value: `${Math.round(analytics.completionRate)}%`,
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: 'text-green-500',
    },
    {
      label: 'Completed Today',
      value: analytics.completedToday,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-blue-500',
    },
    {
      label: 'Overdue',
      value: analytics.overdueCount,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'text-red-500',
    },
    {
      label: 'Total Activities',
      value: allActivities.length,
      icon: <Target className="w-5 h-5" />,
      color: 'text-purple-500',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{metric.label}</p>
                    <p className="text-3xl font-bold">{metric.value}</p>
                  </div>
                  <div className={`${metric.color} opacity-20`}>
                    {metric.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Activity Distribution */}
      {Object.keys(analytics.byType).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Activities by Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {Object.entries(analytics.byType)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([type, stats]) => {
                  const rate = stats.count > 0 ? (stats.completed / stats.count) * 100 : 0;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium capitalize">{type}</span>
                          <Badge variant="outline" className="text-xs">
                            {stats.count}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(rate)}% complete
                        </span>
                      </div>
                      <Progress value={rate} className="h-2" />
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Team Leaderboard */}
      {analytics.teamLeaderboard.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.teamLeaderboard.map((member, index) => (
                  <div key={member.name} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.completed} of {member.total} completed
                      </p>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-0">
                      {Math.round(member.rate)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Monthly Trend Chart */}
      {analytics.monthlyTrend.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle>Last 14 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.monthlyTrend.map((day) => {
                  const rate = day.total > 0 ? (day.completed / day.total) * 100 : 0;
                  return (
                    <div key={day.date}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">{day.date}</span>
                        <span className="text-xs font-medium">
                          {day.completed}/{day.total} completed
                        </span>
                      </div>
                      <Progress value={Math.min(rate, 100)} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
