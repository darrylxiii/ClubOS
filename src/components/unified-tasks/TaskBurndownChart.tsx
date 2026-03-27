import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { useRecharts } from "@/hooks/useRecharts";
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
  const { t } = useTranslation('common');
  const [data, setData] = useState<BurndownData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("14");
  const { recharts, isLoading: rechartsLoading } = useRecharts();

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

      let query = supabase
        .from("unified_tasks")
        .select("id, status, created_at, completed_at")
        .gte("created_at", startDate.toISOString());

      if (objectiveId) {
        query = query.eq("objective_id", objectiveId);
      }

      const { data: tasks, error } = await query;

      if (error) throw error;

      const totalTasks = tasks?.length || 0;
      const idealBurnRate = totalTasks / days;

      const burndownData: BurndownData[] = dateRange.map((date, index) => {
        const tasksCreatedByDate = tasks?.filter(t => 
          new Date(t.created_at) <= date
        ).length || 0;

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

  if (loading || rechartsLoading || !recharts) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } = recharts;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          {t('tasks.burndownChart', 'Burndown Chart')}
        </CardTitle>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t('tasks.last7Days', 'Last 7 days')}</SelectItem>
            <SelectItem value="14">{t('tasks.last14Days', 'Last 14 days')}</SelectItem>
            <SelectItem value="30">{t('tasks.last30Days', 'Last 30 days')}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            {t('tasks.noDataForPeriod', 'No data available for this period')}
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
