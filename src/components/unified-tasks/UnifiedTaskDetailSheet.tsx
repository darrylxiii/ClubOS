import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { Calendar, Clock, Lock, Unlock, Target, ExternalLink, Users, Briefcase, CheckSquare, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TaskComments } from "./TaskComments";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface UnifiedTaskDetailSheetProps {
  task: any;
  open: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

export const UnifiedTaskDetailSheet = ({
  task,
  open,
  onClose,
  onTaskUpdated,
  onStatusChange,
}: UnifiedTaskDetailSheetProps) => {
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
      // Objective
      if (task.objective_id) {
        supabase.from("club_objectives").select("id, title, status").eq("id", task.objective_id).single().then(({ data }) => setObjective(data));
      } else {
        setObjective(null);
      }

      // Project
      if (task.project_id) {
        supabase.from("marketplace_projects").select("id, title, status").eq("id", task.project_id).single().then(({ data }) => setProject(data));
      } else {
        setProject(null);
      }

      // Blocking
      supabase.from("task_dependencies")
        .select("id, task_id, depends_on:unified_tasks!task_dependencies_task_id_fkey(id, title, task_number, status, priority)")
        .eq("depends_on_task_id", task.id)
        .then(({ data }) => setBlockingTasks(data?.map((b: any) => b.depends_on) || []));

      // Blocked by
      supabase.from("task_dependencies")
        .select("id, depends_on_task_id, blocker:unified_tasks!task_dependencies_depends_on_task_id_fkey(id, title, task_number, status, priority)")
        .eq("task_id", task.id)
        .then(({ data }) => setBlockedByTasks(data?.map((b: any) => b.blocker) || []));

      // Subtasks
      (supabase.from("unified_tasks") as any)
        .select("id, title, status, task_number")
        .eq("parent_task_id", task.id)
        .order("created_at", { ascending: true })
        .then(({ data }: any) => setSubtasks(data || []));

      // Owners
      if (task.assignees?.length > 0) {
        const userIds = task.assignees.map((a: any) => a.user_id);
        supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds).then(({ data }) => setOwners(data || []));
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
        user_id: task.user_id,
        created_by: task.user_id,
        task_number: '',
        task_type: 'general',
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add subtask");
    } else {
      setSubtasks([...subtasks, newSub]);
      setNewSubtaskTitle("");
      toast.success("Subtask added");
    }
  };

  const toggleSubtask = async (subtaskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const { error } = await supabase.from("unified_tasks").update({ status: newStatus }).eq("id", subtaskId);
    if (error) {
      toast.error("Failed to update subtask");
    } else {
      setSubtasks(subtasks.map((s) => (s.id === subtaskId ? { ...s, status: newStatus } : s)));
    }
  };

  if (!task) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "in_progress": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "on_hold": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/10 text-red-700 dark:text-red-400";
      case "medium": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const completedSubtasks = subtasks.filter((s) => s.status === "completed").length;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-[520px] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getStatusColor(task.status)} bg-opacity-20`}>
              {task.task_type === "meeting" ? <Users className="h-5 w-5" /> : <Target className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg font-bold truncate">{task.title}</SheetTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Badge variant="outline" className="font-mono text-[10px] h-5">{task.task_number}</Badge>
                <span>Created {format(new Date(task.created_at), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 p-0 h-11 shrink-0">
            <TabsTrigger value="overview" className="h-11 rounded-none border-b-2 border-transparent px-5 text-xs data-[state=active]:border-primary data-[state=active]:bg-background/50">
              Overview
            </TabsTrigger>
            <TabsTrigger value="subtasks" className="h-11 rounded-none border-b-2 border-transparent px-5 text-xs data-[state=active]:border-primary data-[state=active]:bg-background/50">
              <div className="flex items-center gap-1.5">
                Subtasks
                {subtasks.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[9px]">{completedSubtasks}/{subtasks.length}</Badge>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="comments" className="h-11 rounded-none border-b-2 border-transparent px-5 text-xs data-[state=active]:border-primary data-[state=active]:bg-background/50">
              Comments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-y-auto p-5 space-y-5 m-0 focus-visible:ring-0">
            {/* Status & Priority bar */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
              <Select
                value={task.status}
                onValueChange={(value) => {
                  onStatusChange(task.id, value);
                  onClose();
                }}
              >
                <SelectTrigger className="h-8 w-auto gap-1.5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">✋ Pending</SelectItem>
                  <SelectItem value="in_progress">🚀 In Progress</SelectItem>
                  <SelectItem value="on_hold">⏸️ On Hold</SelectItem>
                  <SelectItem value="completed">✅ Completed</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className={`${getPriorityColor(task.priority)} capitalize text-xs`}>
                {task.priority}
              </Badge>
              {task.scheduling_mode && (
                <Badge variant="outline" className="text-xs ml-auto">
                  {task.scheduling_mode === "ai" ? "🤖 AI" : task.scheduling_mode === "hybrid" ? "🔄 Hybrid" : "✋ Manual"}
                </Badge>
              )}
            </div>

            {/* Objective */}
            {objective && (
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground">Objective</p>
                    <Link to={`/objectives/${objective.id}`} className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
                      <span className="truncate">{objective.title}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Project */}
            {project && (
              <div className="p-3 rounded-lg border bg-blue-500/5">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground">Project</p>
                    <Link to={`/projects/${project.id}`} className="text-sm font-medium hover:text-blue-600 transition-colors flex items-center gap-1">
                      <span className="truncate">{project.title}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {task.description && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</h4>
                <p className="text-sm text-foreground/80 leading-relaxed">{task.description}</p>
              </div>
            )}

            {/* Owners */}
            {owners.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Owners</h4>
                <div className="flex flex-wrap gap-2">
                  {owners.map((owner: any) => (
                    <div key={owner.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted border text-sm">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={owner.avatar_url || undefined} />
                        <AvatarFallback className="text-[9px]">{owner.full_name?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-xs">{owner.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dependencies */}
            {(blockingTasks.length > 0 || blockedByTasks.length > 0) && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dependencies</h4>
                {blockingTasks.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Lock className="h-3.5 w-3.5 text-orange-500" />
                      <span className="font-medium">Blocking {blockingTasks.length}</span>
                    </div>
                    {blockingTasks.map((dep: any) => (
                      <div key={dep.id} className="flex items-center gap-2 p-2 rounded border bg-orange-500/5 text-xs">
                        <Badge variant="outline" className="text-[9px]">{dep.task_number}</Badge>
                        <span className="flex-1 truncate">{dep.title}</span>
                      </div>
                    ))}
                  </div>
                )}
                {blockedByTasks.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Unlock className="h-3.5 w-3.5 text-blue-500" />
                      <span className="font-medium">Blocked by {blockedByTasks.length}</span>
                    </div>
                    {blockedByTasks.map((dep: any) => (
                      <div key={dep.id} className="flex items-center gap-2 p-2 rounded border bg-blue-500/5 text-xs">
                        <Badge variant="outline" className="text-[9px]">{dep.task_number}</Badge>
                        <span className="flex-1 truncate">{dep.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              {task.scheduled_start && (
                <div className="p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Clock className="h-3 w-3" /> Scheduled
                  </div>
                  <p className="text-sm font-medium">{format(new Date(task.scheduled_start), "MMM d, HH:mm")}</p>
                </div>
              )}
              {task.due_date && (
                <div className="p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Calendar className="h-3 w-3" /> Due
                  </div>
                  <p className="text-sm font-medium">{format(new Date(task.due_date), "MMM d, yyyy")}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="subtasks" className="flex-1 p-5 flex flex-col m-0 focus-visible:ring-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
              {subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-card/50 hover:bg-card transition-colors cursor-pointer" onClick={() => toggleSubtask(sub.id, sub.status)}>
                  <Checkbox checked={sub.status === "completed"} onCheckedChange={() => toggleSubtask(sub.id, sub.status)} />
                  <span className={`flex-1 text-sm ${sub.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{sub.title}</span>
                </div>
              ))}
              {subtasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">
                  <CheckSquare className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No subtasks yet</p>
                </div>
              )}
            </div>
            <form onSubmit={handleAddSubtask} className="flex gap-2 pt-3 border-t shrink-0">
              <Input placeholder="Add subtask..." value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} className="bg-background text-sm h-9" />
              <Button type="submit" size="icon" className="h-9 w-9 shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="comments" className="flex-1 p-5 m-0 focus-visible:ring-0 overflow-y-auto">
            <TaskComments taskId={task.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
