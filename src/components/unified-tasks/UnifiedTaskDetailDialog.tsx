import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { Calendar, Sparkles, Clock, Lock, Unlock, Target, ExternalLink, Users, Briefcase, CheckSquare, MessageSquare, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TaskComments } from "./TaskComments";
import { toast } from "sonner";
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
  const [project, setProject] = useState<any>(null);
  const [blockingTasks, setBlockingTasks] = useState<any[]>([]);
  const [blockedByTasks, setBlockedByTasks] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
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

      // Load project if exists
      if (task.project_id) {
        const { data: projData } = await supabase
          .from("marketplace_projects")
          .select("id, title, status")
          .eq("id", task.project_id)
          .single();

        setProject(projData);
      } else {
        setProject(null);
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

      // Load subtasks
      const { data: subs } = await supabase
        .from("unified_tasks")
        .select("id, title, status, task_number")
        .eq("parent_task_id", task.id)
        .order("created_at", { ascending: true });

      setSubtasks(subs || []);

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

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    const { data: newSub, error } = await supabase
      .from("unified_tasks")
      .insert({
        title: newSubtaskTitle,
        parent_task_id: task.id,
        status: "pending",
        user_id: task.user_id, // Inherit owner for now
        created_by: task.user_id,
        task_number: '', // Trigger will handle? Or need simplified input
        task_type: 'general'
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add subtask");
      console.error(error);
    } else {
      setSubtasks([...subtasks, newSub]);
      setNewSubtaskTitle("");
      toast.success("Subtask added");
    }
  };

  const toggleSubtask = async (subtaskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";

    const { error } = await supabase
      .from("unified_tasks")
      .update({ status: newStatus })
      .eq("id", subtaskId);

    if (error) {
      toast.error("Failed to update subtask");
    } else {
      setSubtasks(subtasks.map(s => s.id === subtaskId ? { ...s, status: newStatus } : s));
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
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getStatusColor(task.status).replace("text-", "bg-").replace("600", "100")} dark:bg-opacity-20`}>
              {task.task_type === 'meeting' ? <Users className="h-5 w-5" /> : <Target className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">{task.title}</DialogTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Badge variant="outline" className="font-mono text-[10px] h-5">{task.task_number}</Badge>
                <span>Created {format(new Date(task.created_at), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 p-0 h-12">
            <TabsTrigger
              value="overview"
              className="h-12 rounded-none border-b-2 border-transparent px-6 data-[state=active]:border-primary data-[state=active]:bg-background/50 transition-all"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="subtasks"
              className="h-12 rounded-none border-b-2 border-transparent px-6 data-[state=active]:border-primary data-[state=active]:bg-background/50 transition-all"
            >
              <div className="flex items-center gap-2">
                Subtasks
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{subtasks.length}</Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="comments"
              className="h-12 rounded-none border-b-2 border-transparent px-6 data-[state=active]:border-primary data-[state=active]:bg-background/50 transition-all"
            >
              Comments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-y-auto p-6 space-y-6 m-0 focus-visible:ring-0">

            {/* Status Bar */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-muted-foreground">Status</span>
                <Badge className={`text-sm px-3 py-1 capitalize ${getStatusColor(task.status)} border-0 shadow-sm`}>
                  {task.status.replace("_", " ")}
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-muted-foreground">Priority</span>
                <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="capitalize">
                  {task.priority}
                </Badge>
              </div>
            </div>

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

              {/* Project Link */}
              {project && (
                <div className="p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-900/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Part of Project</p>
                        <Link
                          to={`/projects/${project.id}`}
                          className="font-medium hover:text-blue-600 transition-colors flex items-center gap-1"
                        >
                          {project.title}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                    <Badge variant="outline" className={getStatusColor(project.status)}>
                      {project.status?.replace('_', ' ')}
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
              <div className="pb-6">
                <h4 className="font-semibold mb-2">Scheduling Mode</h4>
                <Badge variant="outline">
                  {task.scheduling_mode === 'ai' && '🤖 AI Scheduling'}
                  {task.scheduling_mode === 'manual' && '✋ Manual'}
                  {task.scheduling_mode === 'hybrid' && '🔄 Hybrid'}
                </Badge>
              </div>
            </div>
            {/* End of Overview Content Space */}
          </TabsContent>

          <TabsContent value="subtasks" className="flex-1 p-6 flex flex-col m-0 focus-visible:ring-0">
            <div className="flex items-center gap-2 mb-6">
              <CheckSquare className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Subtasks</h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
              {subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors group cursor-pointer" onClick={() => toggleSubtask(sub.id, sub.status)}>
                  <Checkbox
                    checked={sub.status === 'completed'}
                    onCheckedChange={() => toggleSubtask(sub.id, sub.status)}
                  />
                  <span className={`flex-1 text-sm font-medium ${sub.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {sub.title}
                  </span>
                  <Badge variant="outline" className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                    {sub.task_number}
                  </Badge>
                </div>
              ))}

              {subtasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
                  <CheckSquare className="h-10 w-10 mb-2 opacity-20" />
                  <p>No subtasks yet</p>
                  <p className="text-xs">Break this task down into smaller steps</p>
                </div>
              )}
            </div>

            <form onSubmit={handleAddSubtask} className="flex gap-2 mt-auto pt-4 border-t">
              <Input
                placeholder="Add a new subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                className="bg-background"
              />
              <Button type="submit" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="comments" className="flex-1 p-6 m-0 focus-visible:ring-0 overflow-y-auto">
            <TaskComments taskId={task.id} />
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog >
  );
};