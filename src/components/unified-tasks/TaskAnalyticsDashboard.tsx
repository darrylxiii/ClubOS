import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useRecharts } from "@/hooks/useRecharts";
import { TaskBurndownChart } from "./TaskBurndownChart";
import { TeamWorkloadView } from "./TeamWorkloadView";
import { EstimationVsActualChart } from "./EstimationVsActualChart";
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Target,
  Loader2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  onHold: number;
  overdue: number;
  avgCompletionTime: number;
}

interface TaskAnalyticsDashboardProps {
  objectiveId?: string | null;
}

const STATUS_COLORS = {
  completed: "#22c55e",
  in_progress: "#3b82f6",
  pending: "#f97316",
  on_hold: "#8b5cf6"
};

export const TaskAnalyticsDashboard = ({ objectiveId }: TaskAnalyticsDashboardProps) => {
  const { t } = useTranslation('common');
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [priorityData, setPriorityData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { recharts, isLoading: rechartsLoading } = useRecharts();

  useEffect(() => {
    loadAnalytics();
  }, [objectiveId]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("unified_tasks")
        .select("id, status, priority, is_overdue, created_at, completed_at");

      if (objectiveId) {
        query = query.eq("objective_id", objectiveId);
      }

      const { data: tasks, error } = await query;

      if (error) throw error;

      const total = tasks?.length || 0;
      const completed = tasks?.filter(t => t.status === 'completed').length || 0;
      const inProgress = tasks?.filter(t => t.status === 'in_progress').length || 0;
      const pending = tasks?.filter(t => t.status === 'pending').length || 0;
      const onHold = tasks?.filter(t => t.status === 'on_hold').length || 0;
      const overdue = tasks?.filter(t => t.is_overdue).length || 0;

      const completedTasks = tasks?.filter(t => t.completed_at && t.created_at) || [];
      let avgTime = 0;
      if (completedTasks.length > 0) {
        const totalTime = completedTasks.reduce((acc, t) => {
          const created = new Date(t.created_at).getTime();
          const completedTime = new Date(t.completed_at!).getTime();
          return acc + (completedTime - created);
        }, 0);
        avgTime = totalTime / completedTasks.length / (1000 * 60 * 60 * 24);
      }

      setStats({
        total,
        completed,
        inProgress,
        pending,
        onHold,
        overdue,
        avgCompletionTime: Math.round(avgTime * 10) / 10
      });

      const highPriority = tasks?.filter(t => t.priority === 'high').length || 0;
      const mediumPriority = tasks?.filter(t => t.priority === 'medium').length || 0;
      const lowPriority = tasks?.filter(t => t.priority === 'low').length || 0;

      setPriorityData([
        { name: 'High', value: highPriority, color: '#ef4444' },
        { name: 'Medium', value: mediumPriority, color: '#3b82f6' },
        { name: 'Low', value: lowPriority, color: '#22c55e' }
      ]);

      setStatusData([
        { name: 'Completed', value: completed, color: STATUS_COLORS.completed },
        { name: 'In Progress', value: inProgress, color: STATUS_COLORS.in_progress },
        { name: 'Pending', value: pending, color: STATUS_COLORS.pending },
        { name: 'On Hold', value: onHold, color: STATUS_COLORS.on_hold }
      ]);

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rechartsLoading || !recharts) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } = recharts;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">{t('tasks.totalTasks', 'Total Tasks')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.completed || 0}</p>
                <p className="text-xs text-muted-foreground">{t('tasks.completed', 'Completed')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.overdue || 0}</p>
                <p className="text-xs text-muted-foreground">{t('tasks.overdue', 'Overdue')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.avgCompletionTime || 0}d</p>
                <p className="text-xs text-muted-foreground">{t('tasks.avgTime', 'Avg. Time')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="burndown" className="space-y-4">
        <TabsList>
          <TabsTrigger value="burndown">{t('tasks.burndown', 'Burndown')}</TabsTrigger>
          <TabsTrigger value="workload">{t('tasks.teamWorkload', 'Team Workload')}</TabsTrigger>
          <TabsTrigger value="estimation">{t('tasks.estVsActual', 'Est. vs Actual')}</TabsTrigger>
          <TabsTrigger value="breakdown">{t('tasks.breakdown', 'Breakdown')}</TabsTrigger>
        </TabsList>

        <TabsContent value="burndown">
          <TaskBurndownChart objectiveId={objectiveId} />
        </TabsContent>

        <TabsContent value="workload">
          <TeamWorkloadView objectiveId={objectiveId} />
        </TabsContent>

        <TabsContent value="estimation">
          <EstimationVsActualChart objectiveId={objectiveId} />
        </TabsContent>

        <TabsContent value="breakdown">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('tasks.statusDistribution', 'Status Distribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('tasks.priorityDistribution', 'Priority Distribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={priorityData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
