import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Hand, ParkingCircle } from "lucide-react";

interface TaskWithAssignee {
  id: string;
  task_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
}

interface ClubTasksByMemberProps {
  objectiveId: string;
  onRefresh: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  blocked: "destructive",
  parking_lot: "secondary",
  to_do: "default",
  in_progress: "default",
  on_hold: "secondary",
  completed: "outline",
};

const STATUS_LABELS: Record<string, string> = {
  blocked: "Blocked",
  parking_lot: "Parking Lot",
  to_do: "To Do",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
};

export const ClubTasksByMember = ({ objectiveId, onRefresh }: ClubTasksByMemberProps) => {
  const [tasksByMember, setTasksByMember] = useState<Record<string, TaskWithAssignee[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasksByMember();
  }, [objectiveId]);

  const loadTasksByMember = async () => {
    try {
      const { data, error } = await supabase
        .from("task_assignees")
        .select(`
          user_id,
          profiles!inner(full_name, avatar_url),
          club_tasks!inner(
            id,
            task_number,
            title,
            description,
            status,
            priority,
            due_date,
            objective_id
          )
        `)
        .eq("club_tasks.objective_id", objectiveId);

      if (error) throw error;

      // Group tasks by member
      const grouped: Record<string, TaskWithAssignee[]> = {};
      
      data?.forEach((item: any) => {
        const task = {
          ...item.club_tasks,
          user_id: item.user_id,
          user_name: item.profiles.full_name,
          user_avatar: item.profiles.avatar_url,
        };

        const userId = item.user_id;
        if (!grouped[userId]) {
          grouped[userId] = [];
        }
        grouped[userId].push(task);
      });

      setTasksByMember(grouped);
    } catch (error) {
      console.error("Error loading tasks by member:", error);
      toast.error("Failed to load tasks by member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(tasksByMember).map(([userId, tasks]) => {
        const firstTask = tasks[0];
        const statusCounts = tasks.reduce((acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return (
          <Card key={userId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={firstTask.user_avatar || undefined} />
                    <AvatarFallback>{firstTask.user_name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{firstTask.user_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{tasks.length} tasks</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <Badge key={status} variant={STATUS_COLORS[status] as any}>
                      {STATUS_LABELS[status]}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">ID</TableHead>
                    <TableHead>Task Description</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Blocker</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-mono text-sm">{task.task_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.due_date ? (
                          <span className={new Date(task.due_date) < new Date() ? "text-destructive" : ""}>
                            {format(new Date(task.due_date), "MMM d, yyyy")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[task.status] as any}>
                          {task.status === "blocked" && <Hand className="h-3 w-3 mr-1" />}
                          {task.status === "parking_lot" && <ParkingCircle className="h-3 w-3 mr-1" />}
                          {STATUS_LABELS[task.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.status === "blocked" && (
                          <span className="text-xs text-muted-foreground">See details</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {Object.keys(tasksByMember).length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No tasks assigned yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
