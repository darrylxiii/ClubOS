import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHistoricalTrends } from "@/hooks/useTeamAnalytics";
import { DynamicChart } from "@/components/charts/DynamicChart";
import { TrendingUp, Loader2 } from "lucide-react";

interface HistoricalTrendsChartProps {
  userId: string;
  months?: number;
}

export function HistoricalTrendsChart({ userId, months = 6 }: HistoricalTrendsChartProps) {
  const { t } = useTranslation('common');
  const { data: trends, isLoading } = useHistoricalTrends(userId, months);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('employeesSection.performanceTrends')}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Performance Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!trends?.length ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            {t('employeesSection.noHistoricalData')}
          </div>
        ) : (
          <DynamicChart
            type="line"
            data={trends}
            height={300}
            config={{
              xAxisKey: 'month',
              lines: [
                { dataKey: 'candidates_sourced', stroke: 'hsl(var(--primary))', name: t('employeesSection.candidatesSourced') },
                { dataKey: 'placements', stroke: '#22c55e', name: t('employeesSection.placements') },
                { dataKey: 'revenue', stroke: '#f59e0b', name: t('employeesSection.revenue'), yAxisId: 'right' },
              ],
              legend: true,
              tooltip: {
                formatter: (value: number, name: string) => {
                  if (name === t('employeesSection.revenue')) return [`€${value.toLocaleString()}`, t('employeesSection.revenue')];
                  return [value, name];
                },
              },
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
