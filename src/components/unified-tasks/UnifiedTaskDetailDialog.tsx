import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { Calendar, Sparkles, Clock, Lock, Unlock, Target, ExternalLink, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface UnifiedTaskDetailDialogProps {
  task: any;
  open: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

export const UnifiedTaskDetailDialog = ({ 
  task, 
  open, 
  onClose, 
  onTaskUpdated,
  onStatusChange 
}: UnifiedTaskDetailDialogProps) => {
  const [objective, setObjective] = useState<any>(null);
  const [blockingTasks, setBlockingTasks] = useState<any[]>([]);
  const [blockedByTasks, setBlockedByTasks] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);

  useEffect(() => {
    if (open && task) {
      loadTaskDetails();
    }
  }, [open, task]);

  const loadTaskDetails = async () => {
    if (!task) return;

    try {
      // Load objective if exists
      if (task.objective_id) {
        const { data: objData } = await supabase
          .from("club_objectives")
          .select("id, title, status")
          .eq("id", task.objective_id)
          .single();
        
        setObjective(objData);
      } else {
        setObjective(null);
      }

      // Load blocking tasks (tasks this task blocks)
      const { data: blocking } = await supabase
        .from("task_dependencies")
        .select(`
          id,
          task_id,
          depends_on:unified_tasks!task_dependencies_task_id_fkey(
            id, 
            title, 
            task_number, 
            status,
            priority
          )
        `)
        .eq("depends_on_task_id", task.id);
      
      setBlockingTasks(blocking?.map(b => b.depends_on) || []);

      // Load blocked-by tasks (tasks that block this task)
      const { data: blockedBy } = await supabase
        .from("task_dependencies")
        .select(`
          id,
          depends_on_task_id,
          blocker:unified_tasks!task_dependencies_depends_on_task_id_fkey(
            id, 
            title, 
            task_number, 
            status,
            priority
          )
        `)
        .eq("task_id", task.id);
      
      setBlockedByTasks(blockedBy?.map(b => b.blocker) || []);

      // Load owner profiles if assignees exist
      if (task.assignees && task.assignees.length > 0) {
        const userIds = task.assignees.map((a: any) => a.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);
        
        setOwners(profilesData || []);
      } else {
        setOwners([]);
      }
    } catch (error) {
      console.error("Error loading task details:", error);
    }
  };

  if (!task) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'in_progress': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'on_hold': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'medium': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <DialogTitle className="text-xl">{task.title}</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-sm text-muted-foreground">{task.task_number}</p>
                  {task.auto_scheduled && (
                    <Badge variant="outline" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI Scheduled
                    </Badge>
                  )}
                  {task.migration_status !== 'new' && (
                    <Badge variant="secondary" className="text-xs">
                      {task.migration_status === 'migrated_from_club' && 'From Club'}
                      {task.migration_status === 'migrated_from_pilot' && 'From Pilot'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-6">
          {/* Objective Link */}
          {objective && (
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Part of Objective</p>
                    <Link 
                      to={`/objectives/${objective.id}`}
                      className="font-medium hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {objective.title}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
                <Badge variant="outline" className={getStatusColor(objective.status)}>
                  {objective.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          )}

          {task.description && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span>Description</span>
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Status</h4>
              <Select 
                value={task.status} 
                onValueChange={(value) => {
                  onStatusChange(task.id, value);
                  onClose();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">✋ Pending</SelectItem>
                  <SelectItem value="in_progress">🚀 In Progress</SelectItem>
                  <SelectItem value="on_hold">⏸️ On Hold</SelectItem>
                  <SelectItem value="completed">✅ Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Priority</h4>
              <Badge variant="outline" className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
            </div>
          </div>

          {/* Owners */}
          {owners.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Task Owners
              </h4>
              <div className="flex flex-wrap gap-3">
                {owners.map((owner: any) => (
                  <div key={owner.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={owner.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {owner.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{owner.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies Section */}
          {(blockingTasks.length > 0 || blockedByTasks.length > 0) && (
            <div className="space-y-4">
              <h4 className="font-semibold">Task Dependencies</h4>
              
              {/* Blocking Tasks */}
              {blockingTasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Lock className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">Blocking {blockingTasks.length} task(s)</span>
                  </div>
                  <div className="space-y-2 pl-6">
                    {blockingTasks.map((dep: any) => (
                      <div key={dep.id} className="flex items-center gap-2 p-2 rounded border bg-orange-500/5">
                        <Badge variant="outline" className="text-xs">{dep.task_number}</Badge>
                        <span className="text-sm flex-1">{dep.title}</span>
                        <Badge variant="outline" className={getStatusColor(dep.status)}>
                          {dep.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blocked By Tasks */}
              {blockedByTasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Unlock className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Blocked by {blockedByTasks.length} task(s)</span>
                  </div>
                  <div className="space-y-2 pl-6">
                    {blockedByTasks.map((dep: any) => (
                      <div key={dep.id} className="flex items-center gap-2 p-2 rounded border bg-blue-500/5">
                        <Badge variant="outline" className="text-xs">{dep.task_number}</Badge>
                        <span className="text-sm flex-1">{dep.title}</span>
                        <Badge variant="outline" className={getStatusColor(dep.status)}>
                          {dep.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scheduling Info */}
          <div className="grid grid-cols-2 gap-4">
            {task.scheduled_start && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Scheduled Start
                </h4>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(task.scheduled_start), "MMM d, yyyy 'at' HH:mm")}
                </p>
              </div>
            )}

            {task.due_date && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Due Date
                </h4>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(task.due_date), "MMM d, yyyy")}
                </p>
              </div>
            )}
          </div>

          {/* Scheduling Mode */}
          <div>
            <h4 className="font-semibold mb-2">Scheduling Mode</h4>
            <Badge variant="outline">
              {task.scheduling_mode === 'ai' && '🤖 AI Scheduling'}
              {task.scheduling_mode === 'manual' && '✋ Manual'}
              {task.scheduling_mode === 'hybrid' && '🔄 Hybrid'}
            </Badge>
          </div>
        </div>

        <Separator />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};