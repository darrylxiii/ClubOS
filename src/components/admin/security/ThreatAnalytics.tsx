import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DynamicChart } from '@/components/charts/DynamicChart';
import { useThreatEvents, useThreatSummary } from '@/hooks/useThreatDetection';
import { TrendingUp, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#10b981'];

export function ThreatAnalytics() {
  const { data: threats, isLoading: threatsLoading } = useThreatEvents(100);
  const { data: summary, isLoading: summaryLoading } = useThreatSummary();

  const isLoading = threatsLoading || summaryLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  // Attack types for pie chart
  const attackTypesData = Object.entries(summary?.attacks_by_type || {}).map(([type, count]) => ({
    name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: count as number
  }));

  // Threats over time (last 7 days)
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date()
  });

  const threatsOverTime = last7Days.map(day => {
    const dayStart = startOfDay(day);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    const count = threats?.filter(t => {
      const created = new Date(t.created_at);
      return created >= dayStart && created < dayEnd;
    }).length || 0;

    return {
      date: format(day, 'MMM dd'),
      threats: count
    };
  });

  // Severity breakdown for bar chart
  const severityData = [
    { severity: 'Critical', count: threats?.filter(t => t.severity === 'critical').length || 0 },
    { severity: 'High', count: threats?.filter(t => t.severity === 'high').length || 0 },
    { severity: 'Medium', count: threats?.filter(t => t.severity === 'medium').length || 0 },
    { severity: 'Low', count: threats?.filter(t => t.severity === 'low').length || 0 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Threats Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Threats Over Time (7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DynamicChart
            type="line"
            data={threatsOverTime}
            height={250}
            config={{
              lines: [{ dataKey: 'threats', stroke: 'hsl(var(--primary))', strokeWidth: 2 }],
              xAxisDataKey: 'date',
              showGrid: false,
              showTooltip: true,
            }}
          />
        </CardContent>
      </Card>

      {/* Attack Types Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieIcon className="h-4 w-4" />
            Attack Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attackTypesData.length > 0 ? (
            <DynamicChart
              type="pie"
              data={attackTypesData}
              height={250}
              config={{
                pies: [{
                  dataKey: 'value',
                  nameKey: 'name',
                  innerRadius: 60,
                  outerRadius: 80,
                  paddingAngle: 5,
                  colors: COLORS,
                }],
                showTooltip: true,
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              No attack data to display
            </div>
          )}
        </CardContent>
      </Card>

      {/* Severity Breakdown */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Severity Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DynamicChart
            type="bar"
            data={severityData}
            height={200}
            config={{
              bars: [{ dataKey: 'count', fill: 'hsl(var(--primary))' }],
              xAxisDataKey: 'severity',
              showGrid: false,
              showTooltip: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
