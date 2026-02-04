import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { useCRMAnalytics } from '@/hooks/useCRMAnalytics';
import { useRecharts } from '@/hooks/useRecharts';
import { format, parseISO } from 'date-fns';

interface CRMTrendChartProps {
  dateRange?: 'week' | 'month' | '3months' | '6months' | 'year';
}

export function CRMTrendChart({ dateRange = 'month' }: CRMTrendChartProps) {
  const { recharts, isLoading: chartsLoading } = useRecharts();
  const { data, loading } = useCRMAnalytics({ dateRange });

  if (loading || chartsLoading || !recharts) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } = recharts;
  const trends = data?.trends || [];

  const aggregatedData = trends.reduce((acc: any[], item: any, index: number) => {
    const weekIndex = Math.floor(index / 7);
    if (!acc[weekIndex]) {
      acc[weekIndex] = {
        date: item.date,
        prospects: 0,
        replies: 0,
        meetings: 0,
        deals: 0,
      };
    }
    acc[weekIndex].prospects += item.prospects;
    acc[weekIndex].replies += item.replies;
    acc[weekIndex].meetings += item.meetings;
    acc[weekIndex].deals += item.deals;
    return acc;
  }, []);

  const chartData = dateRange === 'week' ? trends : aggregatedData;

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Activity Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="h-64"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="prospectsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="repliesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="meetingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  try {
                    return format(parseISO(value), 'MMM d');
                  } catch {
                    return value;
                  }
                }}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(value) => {
                  try {
                    return format(parseISO(value), 'MMM d, yyyy');
                  } catch {
                    return value;
                  }
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="prospects"
                name="Prospects"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#prospectsGradient)"
              />
              <Area
                type="monotone"
                dataKey="replies"
                name="Replies"
                stroke="#8B5CF6"
                fillOpacity={1}
                fill="url(#repliesGradient)"
              />
              <Area
                type="monotone"
                dataKey="meetings"
                name="Meetings"
                stroke="#10B981"
                fillOpacity={1}
                fill="url(#meetingsGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </CardContent>
    </Card>
  );
}
