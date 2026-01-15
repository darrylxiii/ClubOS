import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckSquare, ArrowRight, Info, AlertCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { isPast, parseISO } from "date-fns";

interface TaskSummary {
  pending: number;
  overdue: number;
  dueToday: number;
  recentTasks: Array<{
    id: string;
    title: string;
    due_date: string | null;
    priority: string | null;
    status: string;
  }>;
}

export const TaskQueueWidget = () => {
  const { data: taskSummary, isLoading } = useQuery({
    queryKey: ['task-queue-summary'],
    queryFn: async (): Promise<TaskSummary> => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      // Get pending tasks
      const { count: pending } = await supabase
        .from('club_tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']);

      // Get overdue tasks
      const { count: overdue } = await supabase
        .from('club_tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress'])
        .lt('due_date', now.toISOString());

      // Get tasks due today
      const { count: dueToday } = await supabase
        .from('club_tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress'])
        .gte('due_date', todayStart)
        .lt('due_date', todayEnd);

      // Get recent pending tasks
      const { data: recentTasks } = await supabase
        .from('club_tasks')
        .select('id, title, due_date, priority, status')
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(4);

      return {
        pending: pending || 0,
        overdue: overdue || 0,
        dueToday: dueToday || 0,
        recentTasks: recentTasks || [],
      };
    },
    staleTime: 30000, // 30 seconds
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-500';
      case 'high': return 'bg-orange-500/20 text-orange-500';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = taskSummary && taskSummary.pending > 0;

  if (!hasData) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="h-4 w-4 text-primary" />
            Task Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Info className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No pending tasks</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/club-pilot">
                Club Pilot
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              Task Queue
              {taskSummary.overdue > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {taskSummary.overdue} overdue
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/club-pilot">
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-muted/50 text-center">
              <div className="text-lg font-bold">{taskSummary.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="p-2 rounded-lg bg-yellow-500/10 text-center">
              <div className="text-lg font-bold text-yellow-500">{taskSummary.dueToday}</div>
              <div className="text-xs text-muted-foreground">Due Today</div>
            </div>
            <div className={`p-2 rounded-lg text-center ${taskSummary.overdue > 0 ? 'bg-red-500/10' : 'bg-muted/50'}`}>
              <div className={`text-lg font-bold ${taskSummary.overdue > 0 ? 'text-red-500' : ''}`}>
                {taskSummary.overdue}
              </div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </div>
          </div>

          {/* Recent Tasks */}
          {taskSummary.recentTasks.length > 0 && (
            <div className="space-y-1">
              {taskSummary.recentTasks.slice(0, 3).map(task => {
                const isOverdue = task.due_date && isPast(parseISO(task.due_date));
                return (
                  <div 
                    key={task.id} 
                    className={`flex items-center gap-2 p-2 rounded-lg text-sm ${isOverdue ? 'bg-red-500/5' : 'hover:bg-muted/30'} transition-colors`}
                  >
                    {isOverdue ? (
                      <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                    ) : (
                      <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <span className="flex-1 truncate">{task.title}</span>
                    <Badge variant="secondary" className={`text-xs ${getPriorityColor(task.priority ?? 'medium')}`}>
                      {task.priority ?? 'medium'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
