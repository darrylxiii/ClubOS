import { useTranslation } from 'react-i18next';
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useRecharts } from "@/hooks/useRecharts";
import { Loader2, Timer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface EstimationVsActualChartProps {
  objectiveId?: string | null;
}

export function EstimationVsActualChart({ objectiveId }: EstimationVsActualChartProps) {
  const { t } = useTranslation('common');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { recharts, isLoading: rechartsLoading } = useRecharts();

  useEffect(() => {
    loadData();
  }, [objectiveId]);

  const loadData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("unified_tasks")
        .select("title, task_number, estimated_duration_minutes, time_tracked_minutes, status")
        .not("estimated_duration_minutes", "is", null)
        .gt("estimated_duration_minutes", 0);

      if (objectiveId) {
        query = query.eq("objective_id", objectiveId);
      }

      const { data: tasks, error } = await query.limit(20);
      if (error) throw error;

      const chartData = (tasks || [])
        .filter((t) => t.time_tracked_minutes && t.time_tracked_minutes > 0)
        .map((t) => ({
          name: t.task_number || t.title?.slice(0, 15),
          estimated: Math.round((t.estimated_duration_minutes || 0) / 60 * 10) / 10,
          actual: Math.round((t.time_tracked_minutes || 0) / 60 * 10) / 10,
        }));

      setData(chartData);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (loading || rechartsLoading || !recharts) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[250px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Timer className="h-8 w-8 mb-2 opacity-20" />
          <p className="text-sm">{t("no_tasks_with_both", "No tasks with both estimates and tracked time yet.")}</p>
        </CardContent>
      </Card>
    );
  }

  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } = recharts;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Estimated vs Actual (hours)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} label={{ value: "Hours", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="estimated" name="Estimated" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.6} />
            <Bar dataKey="actual" name="Actual" fill="hsl(var(--chart-2, 280 65% 60%))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
