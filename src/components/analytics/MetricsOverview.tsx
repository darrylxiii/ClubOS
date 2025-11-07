import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, Clock, Target, Award } from "lucide-react";
import { HiringMetrics } from "@/hooks/useAnalytics";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricsOverviewProps {
  hiringMetrics: HiringMetrics[];
  isLoading: boolean;
}

export function MetricsOverview({ hiringMetrics, isLoading }: MetricsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate aggregated metrics
  const latestWeek = hiringMetrics[0];
  const previousWeek = hiringMetrics[1];
  
  const totalApplications = hiringMetrics.slice(0, 4).reduce((sum, m) => sum + (m.total_applications || 0), 0);
  const totalHires = hiringMetrics.slice(0, 4).reduce((sum, m) => sum + (m.hires || 0), 0);
  const avgTimeToHire = latestWeek?.avg_time_to_hire_days || 0;
  const activeJobs = latestWeek?.active_jobs || 0;

  const applicationsTrend = previousWeek 
    ? ((latestWeek?.total_applications || 0) - (previousWeek?.total_applications || 0)) / (previousWeek?.total_applications || 1) * 100
    : 0;
  
  const hiresTrend = previousWeek
    ? ((latestWeek?.hires || 0) - (previousWeek?.hires || 0)) / (previousWeek?.hires || 1) * 100
    : 0;

  const metrics = [
    {
      title: "Total Applications",
      value: totalApplications,
      change: applicationsTrend,
      icon: Users,
      description: "Last 4 weeks",
    },
    {
      title: "Successful Hires",
      value: totalHires,
      change: hiresTrend,
      icon: Award,
      description: "Last 4 weeks",
    },
    {
      title: "Avg. Time to Hire",
      value: `${Math.round(avgTimeToHire)}d`,
      change: 0,
      icon: Clock,
      description: "Current period",
    },
    {
      title: "Active Jobs",
      value: activeJobs,
      change: 0,
      icon: Target,
      description: "Currently open",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const isPositive = metric.change > 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;
        
        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {metric.change !== 0 && (
                  <>
                    <TrendIcon className={`h-3 w-3 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
                    <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
                      {Math.abs(Math.round(metric.change))}%
                    </span>
                  </>
                )}
                <span>{metric.description}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}