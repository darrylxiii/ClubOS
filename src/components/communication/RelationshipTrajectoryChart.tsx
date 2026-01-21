import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DynamicChart } from '@/components/charts/DynamicChart';
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
          <DynamicChart
            type="area"
            data={chartData}
            height={200}
            config={{
              xAxisKey: 'date',
              areas: [
                { dataKey: 'health_score', stroke: 'hsl(var(--primary))', fill: 'hsl(var(--primary))', fillOpacity: 0.3, name: 'Health Score' },
                { dataKey: 'engagement', stroke: 'hsl(142, 76%, 36%)', fill: 'hsl(142, 76%, 36%)', fillOpacity: 0.3, name: 'Engagement' },
              ],
              yAxisDomain: [0, 100],
            }}
          />
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
