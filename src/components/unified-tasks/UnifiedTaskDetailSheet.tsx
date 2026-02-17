import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar, Clock, Lock, Unlock, Target, ExternalLink, Users, Briefcase, CheckSquare, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TaskComments } from "./TaskComments";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface UnifiedTaskDetailSheetProps {
  task: any;
  open: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-rose-500",
  in_progress: "bg-amber-500",
  on_hold: "bg-blue-500",
  completed: "bg-emerald-500",
  cancelled: "bg-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

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
    if (open && task) loadTaskDetails();
  }, [open, task]);

  const loadTaskDetails = async () => {
    if (!task) return;
    try {
      if (task.objective_id) {
        supabase.from("club_objectives").select("id, title, status").eq("id", task.objective_id).single().then(({ data }) => setObjective(data));
      } else { setObjective(null); }

      if (task.project_id) {
        supabase.from("marketplace_projects").select("id, title, status").eq("id", task.project_id).single().then(({ data }) => setProject(data));
      } else { setProject(null); }

      supabase.from("task_dependencies")
        .select("id, task_id, depends_on:unified_tasks!task_dependencies_task_id_fkey(id, title, task_number, status, priority)")
        .eq("depends_on_task_id", task.id)
        .then(({ data }) => setBlockingTasks(data?.map((b: any) => b.depends_on) || []));

      supabase.from("task_dependencies")
        .select("id, depends_on_task_id, blocker:unified_tasks!task_dependencies_depends_on_task_id_fkey(id, title, task_number, status, priority)")
        .eq("task_id", task.id)
        .then(({ data }) => setBlockedByTasks(data?.map((b: any) => b.blocker) || []));

      (supabase.from("unified_tasks") as any)
        .select("id, title, status, task_number")
        .eq("parent_task_id", task.id)
        .order("created_at", { ascending: true })
        .then(({ data }: any) => setSubtasks(data || []));

      if (task.assignees?.length > 0) {
        const userIds = task.assignees.map((a: any) => a.user_id);
        supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds).then(({ data }) => setOwners(data || []));
      } else { setOwners([]); }
    } catch (error) {
      console.error("Error loading task details:", error);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const { data: newSub, error } = await supabase
      .from("unified_tasks")
      .insert({ title: newSubtaskTitle, parent_task_id: task.id, status: "pending", user_id: task.user_id, created_by: task.user_id, task_number: '', task_type: 'general' })
      .select().single();
    if (error) { toast.error("Failed to add subtask"); }
    else { setSubtasks([...subtasks, newSub]); setNewSubtaskTitle(""); toast.success("Subtask added"); }
  };

  const toggleSubtask = async (subtaskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const { error } = await supabase.from("unified_tasks").update({ status: newStatus }).eq("id", subtaskId);
    if (error) { toast.error("Failed to update subtask"); }
    else { setSubtasks(subtasks.map((s) => (s.id === subtaskId ? { ...s, status: newStatus } : s))); }
  };

  if (!task) return null;

  const completedSubtasks = subtasks.filter((s) => s.status === "completed").length;

  // Time in status
  const timeInStatus = task.updated_at
    ? formatDistanceToNow(new Date(task.updated_at), { addSuffix: false })
    : null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-[520px] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-5 py-4 border-b flex-shrink-0">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] h-5 shrink-0">{task.task_number}</Badge>
              <span className="text-[10px] text-muted-foreground">
                Created {format(new Date(task.created_at), "MMM d, yyyy")}
              </span>
            </div>
            <SheetTitle className="text-base font-semibold leading-snug">{task.title}</SheetTitle>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-9 shrink-0">
            <TabsTrigger value="overview" className="h-9 rounded-none border-b-2 border-transparent px-4 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Overview
            </TabsTrigger>
            <TabsTrigger value="subtasks" className="h-9 rounded-none border-b-2 border-transparent px-4 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <div className="flex items-center gap-1.5">
                Subtasks
                {subtasks.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[9px]">{completedSubtasks}/{subtasks.length}</Badge>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="comments" className="h-9 rounded-none border-b-2 border-transparent px-4 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Comments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-y-auto p-5 space-y-4 m-0 focus-visible:ring-0">
            {/* Status & Priority */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/30">
              <Select value={task.status} onValueChange={(value) => { onStatusChange(task.id, value); onClose(); }}>
                <SelectTrigger className="h-7 w-auto gap-1.5 text-xs border-0 bg-transparent p-0 px-1 shadow-none">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("h-2 w-2 rounded-full", STATUS_DOT[task.status] || "bg-muted-foreground")} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-1.5">
                        <div className={cn("h-2 w-2 rounded-full", STATUS_DOT[key])} />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                <div className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[task.priority] || "bg-muted-foreground")} />
                {task.priority}
              </div>

              {timeInStatus && (
                <span className="text-[10px] text-muted-foreground/60 ml-auto flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {timeInStatus} in status
                </span>
              )}
            </div>

            {/* Objective */}
            {objective && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border/30 bg-muted/20">
                <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Objective</p>
                  <Link to={`/objectives/${objective.id}`} className="text-xs font-medium hover:text-primary transition-colors flex items-center gap-1">
                    <span className="truncate">{objective.title}</span>
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                  </Link>
                </div>
              </div>
            )}

            {/* Project */}
            {project && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border/30 bg-muted/20">
                <Briefcase className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Project</p>
                  <Link to={`/projects/${project.id}`} className="text-xs font-medium hover:text-blue-600 transition-colors flex items-center gap-1">
                    <span className="truncate">{project.title}</span>
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                  </Link>
                </div>
              </div>
            )}

            {/* Description */}
            {task.description && (
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</h4>
                <div className="prose prose-sm prose-muted max-w-none text-xs leading-relaxed text-foreground/80">
                  <ReactMarkdown>{task.description}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Owners */}
            {owners.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Owners</h4>
                <div className="flex flex-wrap gap-1.5">
                  {owners.map((owner: any) => (
                    <div key={owner.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/30 text-xs">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={owner.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">{owner.full_name?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-[11px]">{owner.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dependencies */}
            {(blockingTasks.length > 0 || blockedByTasks.length > 0) && (
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Dependencies</h4>
                {blockingTasks.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600">
                      <Lock className="h-3 w-3" /> Blocking {blockingTasks.length}
                    </div>
                    {blockingTasks.map((dep: any) => (
                      <div key={dep.id} className="flex items-center gap-2 p-1.5 rounded border border-amber-500/20 bg-amber-500/5 text-[11px]">
                        <div className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[dep.status] || "bg-muted-foreground")} />
                        <span className="flex-1 truncate">{dep.title}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">{dep.task_number}</span>
                      </div>
                    ))}
                  </div>
                )}
                {blockedByTasks.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-medium text-destructive">
                      <Unlock className="h-3 w-3" /> Blocked by {blockedByTasks.length}
                    </div>
                    {blockedByTasks.map((dep: any) => (
                      <div key={dep.id} className="flex items-center gap-2 p-1.5 rounded border border-destructive/20 bg-destructive/5 text-[11px]">
                        <div className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[dep.status] || "bg-muted-foreground")} />
                        <span className="flex-1 truncate">{dep.title}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">{dep.task_number}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-2">
              {task.scheduled_start && (
                <div className="p-2.5 rounded-lg border border-border/30 bg-muted/20">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                    <Clock className="h-2.5 w-2.5" /> Scheduled
                  </div>
                  <p className="text-xs font-medium">{format(new Date(task.scheduled_start), "MMM d, HH:mm")}</p>
                </div>
              )}
              {task.due_date && (
                <div className="p-2.5 rounded-lg border border-border/30 bg-muted/20">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                    <Calendar className="h-2.5 w-2.5" /> Due
                  </div>
                  <p className="text-xs font-medium">{format(new Date(task.due_date), "MMM d, yyyy")}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="subtasks" className="flex-1 p-5 flex flex-col m-0 focus-visible:ring-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-1 mb-3 pr-1">
              {subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/20 bg-card/50 hover:bg-card transition-colors cursor-pointer" onClick={() => toggleSubtask(sub.id, sub.status)}>
                  <Checkbox checked={sub.status === "completed"} onCheckedChange={() => toggleSubtask(sub.id, sub.status)} />
                  <span className={cn("flex-1 text-xs", sub.status === "completed" && "line-through text-muted-foreground")}>{sub.title}</span>
                </div>
              ))}
              {subtasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 border border-dashed border-border/30 rounded-lg text-muted-foreground">
                  <CheckSquare className="h-6 w-6 mb-1.5 opacity-20" />
                  <p className="text-xs">No subtasks yet</p>
                </div>
              )}
            </div>
            <form onSubmit={handleAddSubtask} className="flex gap-1.5 pt-2 border-t border-border/30 shrink-0">
              <Input placeholder="Add subtask…" value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} className="bg-background text-xs h-8" />
              <Button type="submit" size="icon" className="h-8 w-8 shrink-0"><Plus className="h-3.5 w-3.5" /></Button>
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
