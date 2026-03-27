import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Timer, TrendingDown, TrendingUp } from 'lucide-react';

export function PlacementVelocity() {
  const { t } = useTranslation('common');
  const { data, isLoading } = useQuery({
    queryKey: ['placement-velocity'],
    queryFn: async () => {
      // Get hired applications with job creation dates
      const { data: apps } = await supabase
        .from('applications')
        .select('id, status, created_at, updated_at, job_id')
        .eq('status', 'hired')
        .order('updated_at', { ascending: false })
        .limit(200);

      if (!apps || apps.length === 0) return null;

      // Get jobs for creation dates
      const jobIds = [...new Set(apps.map((a) => a.job_id).filter(Boolean))];
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, created_at')
        .in('id', jobIds);

      const jobMap = new Map((jobs || []).map((j) => [j.id, j.created_at]));

      // Calculate velocity for each placement
      const velocities: { days: number; date: string; quarter: string }[] = [];
      const now = new Date();
      const currentYear = now.getFullYear();

      for (const app of apps) {
        const jobCreated = jobMap.get(app.job_id);
        if (!jobCreated || !app.updated_at) continue;

        const days = Math.round(
          (new Date(app.updated_at).getTime() - new Date(jobCreated).getTime()) / 86400000,
        );
        if (days < 0 || days > 365) continue; // filter outliers

        const hireDate = new Date(app.updated_at);
        const q = `Q${Math.ceil((hireDate.getMonth() + 1) / 3)}`;
        velocities.push({ days, date: app.updated_at, quarter: `${q} ${hireDate.getFullYear()}` });
      }

      if (velocities.length === 0) return null;

      // Overall average
      const avgDays = Math.round(velocities.reduce((s, v) => s + v.days, 0) / velocities.length);
      const medianDays = velocities.sort((a, b) => a.days - b.days)[Math.floor(velocities.length / 2)].days;

      // Quarterly breakdown
      const quarterMap = new Map<string, number[]>();
      for (const v of velocities) {
        const existing = quarterMap.get(v.quarter) || [];
        existing.push(v.days);
        quarterMap.set(v.quarter, existing);
      }

      const quarterlyData = Array.from(quarterMap.entries())
        .map(([quarter, days]) => ({
          quarter,
          avgDays: Math.round(days.reduce((s, d) => s + d, 0) / days.length),
          count: days.length,
        }))
        .sort((a, b) => a.quarter.localeCompare(b.quarter))
        .slice(-6);

      // Current vs previous quarter trend
      const latest = quarterlyData[quarterlyData.length - 1];
      const previous = quarterlyData[quarterlyData.length - 2];
      const trend = latest && previous ? latest.avgDays - previous.avgDays : 0;

      return {
        avgDays,
        medianDays,
        totalPlacements: velocities.length,
        quarterlyData,
        trend,
        benchmark: 45, // Industry benchmark (configurable)
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Placement Velocity
        </CardTitle>
        <CardDescription>{t("average_days_from_job", "Average days from job opening to hire completion")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">{t("no_placement_data_available", "No placement data available")}</p>
        ) : (
          <div className="space-y-4">
            {/* Key metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">{t("average", "Average")}</p>
                <p className="text-2xl font-bold">{data.avgDays}d</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">{t("median", "Median")}</p>
                <p className="text-2xl font-bold">{data.medianDays}d</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">{t("benchmark", "Benchmark")}</p>
                <p className="text-2xl font-bold text-muted-foreground">{data.benchmark}d</p>
                <Badge variant={data.avgDays <= data.benchmark ? 'default' : 'destructive'} className="text-xs mt-1">
                  {data.avgDays <= data.benchmark ? 'Above' : 'Below'} Target
                </Badge>
              </div>
            </div>

            {/* Trend */}
            {data.trend !== 0 && (
              <div className="flex items-center gap-2 text-sm">
                {data.trend < 0 ? (
                  <TrendingDown className="h-4 w-4 text-success" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-destructive" />
                )}
                <span className={data.trend < 0 ? 'text-success' : 'text-destructive'}>
                  {Math.abs(data.trend)} days {data.trend < 0 ? 'faster' : 'slower'} vs previous quarter
                </span>
              </div>
            )}

            {/* Quarterly breakdown */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Quarterly Trend ({data.totalPlacements} placements)
              </p>
              {data.quarterlyData.map((q) => (
                <div key={q.quarter} className="flex items-center justify-between text-sm py-1 border-b border-border/20">
                  <span>{q.quarter}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">{q.count} hires</span>
                    <span className="font-medium tabular-nums w-12 text-right">{q.avgDays}d</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
