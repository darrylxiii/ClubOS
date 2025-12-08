import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle, Circle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  priority: string;
  is_completed: boolean;
}

export const ClubPilotTasksWidget = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('pilot_tasks')
        .select('id, title, priority_score, status, completed_at')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .order('priority_score', { ascending: false })
        .limit(5);

      const mapped: Task[] = (data || []).map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority_score > 7 ? 'high' : t.priority_score > 4 ? 'medium' : 'low',
        is_completed: t.status === 'completed'
      }));
      setTasks(mapped);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await supabase
        .from('pilot_tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', taskId);

      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-500';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500';
      default: return 'bg-blue-500/20 text-blue-500';
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Club Pilot Tasks
          <Badge variant="secondary" className="ml-auto text-xs">AI Suggested</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500/50" />
            <p className="text-sm">All caught up! No pending tasks.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {tasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group transition-colors"
              >
                <button
                  onClick={() => handleCompleteTask(task.id)}
                  className="text-muted-foreground hover:text-green-500 transition-colors"
                >
                  <Circle className="h-5 w-5" />
                </button>
                <span className="flex-1 text-sm line-clamp-1">{task.title}</span>
                <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/club-pilot">
            <ArrowRight className="h-4 w-4 mr-2" />
            View All Tasks
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
