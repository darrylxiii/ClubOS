import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHistoricalTrends } from "@/hooks/useTeamAnalytics";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";

interface HistoricalTrendsChartProps {
  userId: string;
  months?: number;
}

export function HistoricalTrendsChart({ userId, months = 6 }: HistoricalTrendsChartProps) {
  const { data: trends, isLoading } = useHistoricalTrends(userId, months);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Trends
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
            No historical data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                className="text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'revenue') return [`€${value.toLocaleString()}`, 'Revenue'];
                  return [value, name === 'candidates_sourced' ? 'Candidates Sourced' : 'Placements'];
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="candidates_sourced"
                name="Candidates Sourced"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="placements"
                name="Placements"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e' }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
