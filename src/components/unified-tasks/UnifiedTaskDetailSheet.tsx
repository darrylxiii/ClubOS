import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar, Clock, Lock, Unlock, Target, ExternalLink, Users, Briefcase, CheckSquare, Plus, Building2, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskComments } from "./TaskComments";
import { InlineTaskEditor } from "./InlineTaskEditor";
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
  const queryClient = useQueryClient();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [localSubtasks, setLocalSubtasks] = useState<any[]>([]);
  const [editingField, setEditingField] = useState<'title' | 'description' | null>(null);

  const taskId = task?.id;
  const isOpen = open && !!task;

  const { data: objective } = useQuery({
    queryKey: ["task-objective", task?.objective_id],
    queryFn: async () => {
      const { data } = await supabase.from("club_objectives").select("id, title, status").eq("id", task.objective_id).maybeSingle();
      return data;
    },
    enabled: isOpen && !!task?.objective_id,
  });

  const { data: project } = useQuery({
    queryKey: ["task-project", task?.project_id],
    queryFn: async () => {
      const { data } = await supabase.from("marketplace_projects").select("id, title, status").eq("id", task.project_id).maybeSingle();
      return data;
    },
    enabled: isOpen && !!task?.project_id,
  });

  const { data: blockingTasks = [] } = useQuery({
    queryKey: ["task-blocking", taskId],
    queryFn: async () => {
      const { data } = await supabase.from("task_dependencies")
        .select("id, task_id, depends_on:unified_tasks!task_dependencies_task_id_fkey(id, title, task_number, status, priority)")
        .eq("depends_on_task_id", taskId);
      return data?.map((b: any) => b.depends_on) || [];
    },
    enabled: isOpen,
  });

  const { data: blockedByTasks = [] } = useQuery({
    queryKey: ["task-blocked-by", taskId],
    queryFn: async () => {
      const { data } = await supabase.from("task_dependencies")
        .select("id, depends_on_task_id, blocker:unified_tasks!task_dependencies_depends_on_task_id_fkey(id, title, task_number, status, priority)")
        .eq("task_id", taskId);
      return data?.map((b: any) => b.blocker) || [];
    },
    enabled: isOpen,
  });

  const { data: subtasksData = [] } = useQuery({
    queryKey: ["task-subtasks", taskId],
    queryFn: async () => {
      const { data } = await (supabase.from("unified_tasks") as any)
        .select("id, title, status, task_number")
        .eq("parent_task_id", taskId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: isOpen,
  });

  const { data: owners = [] } = useQuery({
    queryKey: ["task-owners", taskId],
    queryFn: async () => {
      if (!task?.assignees?.length) return [];
      const userIds = task.assignees.map((a: any) => a.user_id);
      const { data } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      return data || [];
    },
    enabled: isOpen,
  });

  const { data: activityLog = [] } = useQuery({
    queryKey: ["task-activity", taskId],
    queryFn: async () => {
      const { data } = await supabase
        .from("task_activity" as any)
        .select("*, profiles:user_id(full_name)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: isOpen,
  });

  const subtasks = [...subtasksData, ...localSubtasks.filter(ls => !subtasksData.some((s: any) => s.id === ls.id))];

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const { data: newSub, error } = await supabase
      .from("unified_tasks")
      .insert({ title: newSubtaskTitle, parent_task_id: task.id, status: "pending", user_id: task.user_id, created_by: task.user_id, task_number: '', task_type: 'general' })
      .select().single();
    if (error) { toast.error("Failed to add subtask"); }
    else { setLocalSubtasks(prev => [...prev, newSub]); setNewSubtaskTitle(""); toast.success("Subtask added"); }
  };

  const toggleSubtask = async (subtaskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const { error } = await supabase.from("unified_tasks").update({ status: newStatus }).eq("id", subtaskId);
    if (error) { toast.error("Failed to update subtask"); }
    else {
      setLocalSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, status: newStatus } : s));
      queryClient.invalidateQueries({ queryKey: ["task-subtasks", taskId] });
    }
  };

  const handleInlineUpdate = async (field: string, value: string) => {
    const { error } = await supabase.from("unified_tasks").update({ [field]: value, updated_at: new Date().toISOString() }).eq("id", taskId);
    if (error) { toast.error(`Failed to update ${field}`); }
    else { toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`); onTaskUpdated(); }
  };

  const handlePriorityChange = async (newPriority: string) => {
    const { error } = await supabase.from("unified_tasks").update({ priority: newPriority, updated_at: new Date().toISOString() }).eq("id", taskId);
    if (error) { toast.error("Failed to update priority"); }
    else { toast.success("Priority updated"); onTaskUpdated(); }
  };

  const handleDueDateChange = async (date: Date | undefined) => {
    const { error } = await supabase.from("unified_tasks").update({ due_date: date ? date.toISOString() : null, updated_at: new Date().toISOString() }).eq("id", taskId);
    if (error) { toast.error("Failed to update due date"); }
    else { toast.success("Due date updated"); onTaskUpdated(); }
  };

  if (!task) return null;

  const completedSubtasks = subtasks.filter((s) => s.status === "completed").length;

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
            {editingField === 'title' ? (
              <InlineTaskEditor
                taskId={taskId}
                field="title"
                value={task.title}
                onSave={() => { setEditingField(null); onTaskUpdated(); }}
                onCancel={() => setEditingField(null)}
              />
            ) : (
              <div className="group/title flex items-center gap-1.5">
                <SheetTitle className="text-base font-semibold leading-snug flex-1">{task.title}</SheetTitle>
                <button onClick={() => setEditingField('title')} className="opacity-0 group-hover/title:opacity-100 p-1 rounded hover:bg-muted transition-all">
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            )}
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
            <TabsTrigger value="activity" className="h-9 rounded-none border-b-2 border-transparent px-4 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Activity
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

              <Select value={task.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger className="h-7 w-auto gap-1.5 text-xs border-0 bg-transparent p-0 px-1 shadow-none">
                  <div className="flex items-center gap-1 capitalize">
                    <div className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[task.priority] || "bg-muted-foreground")} />
                    {task.priority}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {["low", "medium", "high"].map((p) => (
                    <SelectItem key={p} value={p}>
                      <div className="flex items-center gap-1.5 capitalize">
                        <div className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[p])} />
                        {p}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {timeInStatus && (
                <span className="text-[10px] text-muted-foreground/60 ml-auto flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {timeInStatus} in status
                </span>
              )}
            </div>

            {/* Job/Company */}
            {(task.job || task.company) && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-primary/20 bg-primary/5">
                <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Job / Company</p>
                  <div className="flex items-center gap-1.5">
                    {task.job && (
                      <Link to={`/job-dashboard?jobId=${task.job_id}`} className="text-xs font-medium hover:text-primary transition-colors flex items-center gap-1">
                        <span className="truncate">{task.job.title}</span>
                        <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      </Link>
                    )}
                    {task.company && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Building2 className="h-2.5 w-2.5" />
                        {task.company.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

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
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Description</h4>
                {!editingField && (
                  <button onClick={() => setEditingField('description')} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">
                    <Pencil className="h-2.5 w-2.5" /> Edit
                  </button>
                )}
              </div>
              {editingField === 'description' ? (
                <InlineTaskEditor
                  taskId={taskId}
                  field="description"
                  value={task.description || ''}
                  onSave={() => { setEditingField(null); onTaskUpdated(); }}
                  onCancel={() => setEditingField(null)}
                />
              ) : task.description ? (
                <div className="prose prose-sm prose-muted max-w-none text-xs leading-relaxed text-foreground/80">
                  <ReactMarkdown>{task.description}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic cursor-pointer hover:text-muted-foreground transition-colors" onClick={() => setEditingField('description')}>
                  Click to add description...
                </p>
              )}
            </div>

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
              <div className="p-2.5 rounded-lg border border-border/30 bg-muted/20">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                  <Calendar className="h-2.5 w-2.5" /> Due Date
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-xs font-medium hover:text-primary transition-colors text-left">
                      {task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "Set due date..."}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarWidget
                      mode="single"
                      selected={task.due_date ? new Date(task.due_date) : undefined}
                      onSelect={handleDueDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
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

          <TabsContent value="activity" className="flex-1 p-5 m-0 focus-visible:ring-0 overflow-y-auto">
            {activityLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Clock className="h-6 w-6 mb-1.5 opacity-20" />
                <p className="text-xs">No activity recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activityLog.map((entry: any) => (
                  <div key={entry.id} className="flex items-start gap-2 p-2 rounded-lg border border-border/20 bg-card/50 text-[11px]">
                    <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5 shrink-0",
                      entry.action === 'status_change' && entry.new_value === 'completed' ? "bg-emerald-500" :
                      entry.action === 'status_change' ? "bg-amber-500" : "bg-blue-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground">
                        <span className="font-medium">{(entry.profiles as any)?.full_name || 'System'}</span>
                        {' '}changed <span className="font-medium">{entry.field_name}</span>
                        {' '}from <Badge variant="outline" className="text-[9px] h-4 px-1">{entry.old_value}</Badge>
                        {' '}to <Badge variant="outline" className="text-[9px] h-4 px-1">{entry.new_value}</Badge>
                      </p>
                      <p className="text-muted-foreground text-[10px] mt-0.5">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="comments" className="flex-1 p-5 m-0 focus-visible:ring-0 overflow-y-auto">
            <TaskComments taskId={task.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
