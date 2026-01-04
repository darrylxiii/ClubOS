import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useBenchmarks, Period } from "@/hooks/useTeamAnalytics";
import { useState } from "react";
import { 
  BarChart3, 
  Users, 
  CheckCircle2,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { AnalyticsCardSkeleton } from "@/components/LoadingSkeletons";

interface BenchmarkComparisonProps {
  userId: string;
}

export function BenchmarkComparison({ userId }: BenchmarkComparisonProps) {
  const [period, setPeriod] = useState<Period>('monthly');
  const { data: benchmarks, isLoading } = useBenchmarks(userId, period);

  if (isLoading || !benchmarks) {
    return <AnalyticsCardSkeleton />;
  }

  const metrics = [
    {
      label: 'Candidates Sourced',
      icon: Users,
      user: benchmarks.user.sourced,
      teamAvg: benchmarks.teamAverage.sourced,
      top10: benchmarks.top10.sourced,
      color: 'text-blue-500',
    },
    {
      label: 'Placements Made',
      icon: CheckCircle2,
      user: benchmarks.user.placed,
      teamAvg: benchmarks.teamAverage.placed,
      top10: benchmarks.top10.placed,
      color: 'text-green-500',
    },
    {
      label: 'Revenue Generated',
      icon: DollarSign,
      user: benchmarks.user.revenue,
      teamAvg: benchmarks.teamAverage.revenue,
      top10: benchmarks.top10.revenue,
      color: 'text-amber-500',
      isCurrency: true,
    },
  ];

  const getPercentage = (value: number, max: number) => {
    if (max === 0) return 0;
    return Math.min((value / max) * 100, 100);
  };

  const getPerformanceLabel = (user: number, teamAvg: number) => {
    if (teamAvg === 0) return 'No data';
    const ratio = user / teamAvg;
    if (ratio >= 1.5) return 'Exceptional';
    if (ratio >= 1.2) return 'Above Average';
    if (ratio >= 0.8) return 'On Track';
    if (ratio >= 0.5) return 'Below Average';
    return 'Needs Improvement';
  };

  const getPerformanceColor = (user: number, teamAvg: number) => {
    if (teamAvg === 0) return 'text-muted-foreground';
    const ratio = user / teamAvg;
    if (ratio >= 1.2) return 'text-green-500';
    if (ratio >= 0.8) return 'text-blue-500';
    if (ratio >= 0.5) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Performance Benchmarks
          </CardTitle>
          <div className="flex gap-1">
            {(['weekly', 'monthly', 'quarterly'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  period === p 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const maxValue = Math.max(metric.user, metric.teamAvg, metric.top10);
          const formatValue = (v: number) => 
            metric.isCurrency ? `€${v.toLocaleString()}` : v.toString();

          return (
            <div key={metric.label} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                  <span className="font-medium text-sm">{metric.label}</span>
                </div>
                <span className={`text-xs font-medium ${getPerformanceColor(metric.user, metric.teamAvg)}`}>
                  {getPerformanceLabel(metric.user, metric.teamAvg)}
                </span>
              </div>

              <div className="space-y-2">
                {/* User */}
                <div className="flex items-center gap-3">
                  <span className="text-xs w-20 text-muted-foreground">You</span>
                  <div className="flex-1">
                    <Progress 
                      value={getPercentage(metric.user, maxValue)} 
                      className="h-2"
                    />
                  </div>
                  <span className="text-xs font-medium w-20 text-right">
                    {formatValue(metric.user)}
                  </span>
                </div>

                {/* Team Avg */}
                <div className="flex items-center gap-3">
                  <span className="text-xs w-20 text-muted-foreground">Team Avg</span>
                  <div className="flex-1">
                    <Progress 
                      value={getPercentage(metric.teamAvg, maxValue)} 
                      className="h-2 [&>div]:bg-blue-500/50"
                    />
                  </div>
                  <span className="text-xs w-20 text-right text-muted-foreground">
                    {formatValue(Math.round(metric.teamAvg))}
                  </span>
                </div>

                {/* Top 10% */}
                <div className="flex items-center gap-3">
                  <span className="text-xs w-20 text-muted-foreground">Top 10%</span>
                  <div className="flex-1">
                    <Progress 
                      value={getPercentage(metric.top10, maxValue)} 
                      className="h-2 [&>div]:bg-amber-500/50"
                    />
                  </div>
                  <span className="text-xs w-20 text-right text-muted-foreground">
                    {formatValue(metric.top10)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
