import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface TrajectoryDataPoint {
  date: string;
  health_score: number;
  engagement: number;
  predicted?: boolean;
}

interface RelationshipTrajectoryChartProps {
  data?: TrajectoryDataPoint[];
  currentHealth: number;
  trajectory: 'improving' | 'stable' | 'declining';
}

export function RelationshipTrajectoryChart({ 
  data, 
  currentHealth, 
  trajectory 
}: RelationshipTrajectoryChartProps) {
  const chartData = useMemo(() => {
    if (data && data.length > 0) return data;

    // Generate sample data based on trajectory
    const today = new Date();
    const points: TrajectoryDataPoint[] = [];
    
    // Historical data (past 14 days)
    for (let i = 14; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      let baseHealth = currentHealth;
      if (trajectory === 'improving') {
        baseHealth = currentHealth - (14 - i) * 2;
      } else if (trajectory === 'declining') {
        baseHealth = currentHealth + (14 - i) * 2;
      }
      
      points.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        health_score: Math.max(0, Math.min(100, baseHealth + (Math.random() * 10 - 5))),
        engagement: Math.max(0, Math.min(100, baseHealth * 0.9 + (Math.random() * 15 - 7))),
        predicted: false,
      });
    }

    // Future predictions (next 7 days)
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      let predictedHealth = currentHealth;
      if (trajectory === 'improving') {
        predictedHealth = currentHealth + i * 3;
      } else if (trajectory === 'declining') {
        predictedHealth = currentHealth - i * 3;
      }
      
      points.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        health_score: Math.max(0, Math.min(100, predictedHealth)),
        engagement: Math.max(0, Math.min(100, predictedHealth * 0.85)),
        predicted: true,
      });
    }

    return points;
  }, [data, currentHealth, trajectory]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isPredicted = payload[0].payload.predicted;
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-1">
            {label} {isPredicted && <span className="text-muted-foreground">(Predicted)</span>}
          </p>
          <p className="text-sm text-green-400">
            Health: {Math.round(payload[0].value)}%
          </p>
          <p className="text-sm text-blue-400">
            Engagement: {Math.round(payload[1].value)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Relationship Trajectory
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="health_score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#healthGradient)"
              />
              <Area
                type="monotone"
                dataKey="engagement"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                fill="url(#engagementGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">Health Score</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Engagement</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 border-t-2 border-dashed border-muted-foreground" />
            <span className="text-xs text-muted-foreground">Predicted</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
