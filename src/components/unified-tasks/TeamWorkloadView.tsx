import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Users, AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";

interface TeamMemberWorkload {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalTimeTracked: number;
  capacityPercentage: number;
}

interface TeamWorkloadViewProps {
  objectiveId?: string | null;
}

const MAX_RECOMMENDED_TASKS = 10; // Baseline for "full" workload

export const TeamWorkloadView = ({ objectiveId }: TeamWorkloadViewProps) => {
  const [workloads, setWorkloads] = useState<TeamMemberWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkloads();
  }, [objectiveId]);

  const loadWorkloads = async () => {
    setLoading(true);
    try {
      // Get all assignees with their tasks
      let query = supabase
        .from("unified_task_assignees")
        .select(`
          user_id,
          unified_tasks!inner(
            id, status, is_overdue, time_tracked_minutes
          ),
          profiles!inner(full_name, avatar_url)
        `);

      if (objectiveId) {
        query = query.eq("unified_tasks.objective_id", objectiveId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate by user
      const userMap = new Map<string, TeamMemberWorkload>();

      data?.forEach((assignment: any) => {
        const userId = assignment.user_id;
        const task = assignment.unified_tasks;
        const profile = assignment.profiles;

        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId,
            fullName: profile.full_name || "Unknown",
            avatarUrl: profile.avatar_url,
            totalTasks: 0,
            completedTasks: 0,
            inProgressTasks: 0,
            overdueTasks: 0,
            totalTimeTracked: 0,
            capacityPercentage: 0
          });
        }

        const member = userMap.get(userId)!;
        member.totalTasks++;
        member.totalTimeTracked += task.time_tracked_minutes || 0;

        if (task.status === 'completed') {
          member.completedTasks++;
        } else if (task.status === 'in_progress') {
          member.inProgressTasks++;
        }

        if (task.is_overdue) {
          member.overdueTasks++;
        }
      });

      // Calculate capacity percentages
      const workloadArray = Array.from(userMap.values()).map(member => ({
        ...member,
        capacityPercentage: Math.min(100, Math.round((member.totalTasks / MAX_RECOMMENDED_TASKS) * 100))
      }));

      // Sort by workload (highest first)
      workloadArray.sort((a, b) => b.totalTasks - a.totalTasks);

      setWorkloads(workloadArray);
    } catch (error) {
      console.error("Error loading workloads:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-500";
    if (percentage >= 70) return "text-yellow-500";
    return "text-green-500";
  };

  const getCapacityBg = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Team Workload
        </CardTitle>
      </CardHeader>
      <CardContent>
        {workloads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No team members with assigned tasks</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workloads.map((member) => (
              <div key={member.userId} className="p-4 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback>
                      {member.fullName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.totalTasks} tasks assigned
                    </p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge 
                          variant="outline" 
                          className={getCapacityColor(member.capacityPercentage)}
                        >
                          {member.capacityPercentage}% capacity
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Based on {MAX_RECOMMENDED_TASKS} tasks recommended max</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <Progress 
                  value={member.capacityPercentage} 
                  className="h-2 mb-3"
                />

                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span>{member.inProgressTasks} active</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span>{member.completedTasks} done</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {member.overdueTasks > 0 ? (
                      <>
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                        <span className="text-red-500">{member.overdueTasks} overdue</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">0 overdue</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>{Math.round(member.totalTimeTracked / 60)}h tracked</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
