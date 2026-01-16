import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";
import { TrendingDown, Loader2 } from "lucide-react";

interface BurndownData {
  date: string;
  remaining: number;
  completed: number;
  ideal: number;
}

interface TaskBurndownChartProps {
  objectiveId?: string | null;
}

export const TaskBurndownChart = ({ objectiveId }: TaskBurndownChartProps) => {
  const [data, setData] = useState<BurndownData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("14");

  useEffect(() => {
    loadBurndownData();
  }, [objectiveId, timeRange]);

  const loadBurndownData = async () => {
    setLoading(true);
    try {
      const days = parseInt(timeRange);
      const startDate = subDays(new Date(), days);
      const endDate = new Date();
      
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

      // Get all tasks in the range
      let query = supabase
        .from("unified_tasks")
        .select("id, status, created_at, completed_at")
        .gte("created_at", startDate.toISOString());

      if (objectiveId) {
        query = query.eq("objective_id", objectiveId);
      }

      const { data: tasks, error } = await query;

      if (error) throw error;

      // Calculate burndown for each day
      const totalTasks = tasks?.length || 0;
      const idealBurnRate = totalTasks / days;

      const burndownData: BurndownData[] = dateRange.map((date, index) => {
        const dayStart = startOfDay(date);
        
        // Count tasks created before or on this day
        const tasksCreatedByDate = tasks?.filter(t => 
          t.created_at && new Date(t.created_at) <= date
        ).length || 0;

        // Count tasks completed before or on this day
        const tasksCompletedByDate = tasks?.filter(t => 
          t.completed_at && new Date(t.completed_at) <= date
        ).length || 0;

        const remaining = tasksCreatedByDate - tasksCompletedByDate;
        const ideal = Math.max(0, totalTasks - (idealBurnRate * (index + 1)));

        return {
          date: format(date, "MMM d"),
          remaining,
          completed: tasksCompletedByDate,
          ideal: Math.round(ideal)
        };
      });

      setData(burndownData);
    } catch (error) {
      console.error("Error loading burndown data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          Burndown Chart
        </CardTitle>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No data available for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRemaining" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="remaining"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorRemaining)"
                name="Remaining Tasks"
              />
              <Line
                type="monotone"
                dataKey="ideal"
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                dot={false}
                name="Ideal Burndown"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
