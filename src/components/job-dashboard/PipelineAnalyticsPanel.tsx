import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3 } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { useRecharts } from '@/hooks/useRecharts';
import { usePipelineAnalytics } from '@/hooks/usePipelineAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { JobMetrics } from '@/hooks/useJobDashboardData';

interface PipelineStage {
  order: number;
  name: string;
  [key: string]: unknown;
}

interface PipelineAnalyticsPanelProps {
  jobId: string;
  stages: PipelineStage[];
  metrics: JobMetrics | null;
  applications: Record<string, unknown>[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
];

export const PipelineAnalyticsPanel = memo(({
  jobId,
  stages,
  metrics,
  applications,
}: PipelineAnalyticsPanelProps) => {
  const { t } = useTranslation('jobDashboard');
  const { recharts, isLoading: rechartsLoading } = useRecharts();
  const { data: analyticsData, isLoading: analyticsLoading } = usePipelineAnalytics(jobId);

  // Stage conversion funnel data
  const funnelData = useMemo(() => {
    if (!metrics) return [];
    const sorted = [...stages].sort((a, b) => a.order - b.order);
    return sorted.map((stage) => ({
      name: stage.name,
      count: metrics.stageBreakdown[stage.order] || 0,
      rate: metrics.conversionRates[`${stage.order}-${stage.order + 1}`],
    }));
  }, [stages, metrics]);

  // Time in stage data with color coding
  const timeData = useMemo(() => {
    if (!metrics) return [];
    const sorted = [...stages].sort((a, b) => a.order - b.order);
    return sorted.map((stage) => {
      const days = metrics.avgDaysInStage[stage.order] || 0;
      return {
        name: stage.name,
        days: Math.round(days * 10) / 10,
        fill: days > 14 ? 'hsl(var(--destructive))' : days > 7 ? 'hsl(var(--warning, 38 92% 50%))' : 'hsl(var(--success, 142 71% 45%))',
      };
    });
  }, [stages, metrics]);

  const isLoading = rechartsLoading || analyticsLoading;

  return (
    <CollapsibleSection
      title={t('analytics.pipelineInsights', 'Pipeline Insights')}
      icon={BarChart3}
      defaultExpanded={false}
    >
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Stage Conversion Funnel */}
          <div className="p-4 rounded-lg bg-muted/20 border border-border/20">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
              {t('analytics.conversionFunnel', 'Conversion Funnel')}
            </h4>
            {recharts && funnelData.length > 0 ? (
              <recharts.ResponsiveContainer width="100%" height={160}>
                <recharts.BarChart data={funnelData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <recharts.XAxis type="number" hide />
                  <recharts.YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <recharts.Tooltip
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--card))',
                    }}
                    formatter={(value: number, _name: string, props: any) => {
                      const rate = props.payload?.rate;
                      return [
                        `${value} candidate${value !== 1 ? 's' : ''}${rate !== undefined ? ` (${Math.round(rate)}% pass)` : ''}`,
                        '',
                      ];
                    }}
                  />
                  <recharts.Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
                </recharts.BarChart>
              </recharts.ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground">{t('analytics.noData', 'No data available')}</p>
            )}
          </div>

          {/* 2. Source Distribution */}
          <div className="p-4 rounded-lg bg-muted/20 border border-border/20">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
              {t('analytics.sourceDistribution', 'Source Distribution')}
            </h4>
            {recharts && analyticsData?.sourceBreakdown && analyticsData.sourceBreakdown.length > 0 ? (
              <recharts.ResponsiveContainer width="100%" height={160}>
                <recharts.PieChart>
                  <recharts.Pie
                    data={analyticsData.sourceBreakdown}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={2}
                    label={({ source, percent }: { source: string; percent: number }) =>
                      `${source} ${Math.round(percent * 100)}%`
                    }
                    labelLine={false}
                  >
                    {analyticsData.sourceBreakdown.map((_entry, i) => (
                      <recharts.Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </recharts.Pie>
                  <recharts.Tooltip
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--card))',
                    }}
                  />
                </recharts.PieChart>
              </recharts.ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground">{t('analytics.noData', 'No data available')}</p>
            )}
          </div>

          {/* 3. Time in Stage Heatmap */}
          <div className="p-4 rounded-lg bg-muted/20 border border-border/20">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
              {t('analytics.timeInStage', 'Avg. Time in Stage')}
            </h4>
            {recharts && timeData.length > 0 ? (
              <recharts.ResponsiveContainer width="100%" height={160}>
                <recharts.BarChart data={timeData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <recharts.XAxis type="number" hide />
                  <recharts.YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <recharts.Tooltip
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--card))',
                    }}
                    formatter={(value: number) => [`${value} days`, '']}
                  />
                  <recharts.Bar dataKey="days" radius={[0, 4, 4, 0]} barSize={16}>
                    {timeData.map((entry, i) => (
                      <recharts.Cell key={i} fill={entry.fill} />
                    ))}
                  </recharts.Bar>
                </recharts.BarChart>
              </recharts.ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground">{t('analytics.noData', 'No data available')}</p>
            )}
          </div>

          {/* 4. Recruiter Activity */}
          <div className="p-4 rounded-lg bg-muted/20 border border-border/20">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
              {t('analytics.recruiterActivity', 'Recruiter Activity')}
            </h4>
            {analyticsData?.recruiterActivity && analyticsData.recruiterActivity.length > 0 ? (
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {analyticsData.recruiterActivity.map((r) => {
                  const initials = r.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <div key={r.userId} className="flex items-center gap-2 text-xs">
                      <Avatar className="h-5 w-5 shrink-0">
                        {r.avatarUrl && <AvatarImage src={r.avatarUrl} />}
                        <AvatarFallback className="text-[8px] bg-muted/50">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="truncate flex-1 font-medium">{r.name}</span>
                      <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                        <span title={t("stage_changes", "Stage changes")}>{r.stageChanges}m</span>
                        <span title={t("interviews", "Interviews")}>{r.interviews}i</span>
                        <span title={t("messages", "Messages")}>{r.messages}e</span>
                        <span className="font-semibold text-foreground ml-1">{r.total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t('analytics.noActivity', 'No recruiter activity yet')}</p>
            )}
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
});

PipelineAnalyticsPanel.displayName = 'PipelineAnalyticsPanel';
