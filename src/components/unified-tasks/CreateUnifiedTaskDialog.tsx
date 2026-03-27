import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTaskBoard } from "@/contexts/TaskBoardContext";
import { toast } from "sonner";
import { Calendar as CalendarIcon, User, Users, X } from "lucide-react";
import { format } from "date-fns";
import { Briefcase } from "lucide-react";

interface CreateUnifiedTaskDialogProps {
  objectiveId: string | null;
  defaultStatus?: string;
  children: React.ReactNode;
  onTaskCreated: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialTitle?: string;
  initialDescription?: string;
  initialPriority?: string;
  jobId?: string;
  companyId?: string;
  jobTitle?: string;
}

export const CreateUnifiedTaskDialog = ({
  objectiveId,
  defaultStatus = "pending",
  children,
  onTaskCreated,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  initialTitle = "",
  initialDescription = "",
  initialPriority = "medium",
  jobId,
  companyId,
  jobTitle,
}: CreateUnifiedTaskDialogProps) => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { currentBoard } = useTaskBoard();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [assignToSelf, setAssignToSelf] = useState(true);
  const [showAssignOthers, setShowAssignOthers] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  const [selectedObjective, setSelectedObjective] = useState<string | undefined>(objectiveId || undefined);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [blockingTasks, setBlockingTasks] = useState<string[]>([]);
  const [blockedByTasks, setBlockedByTasks] = useState<string[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(jobId || undefined);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>(companyId || undefined);
  const [formData, setFormData] = useState({
    title: initialTitle,
    description: initialDescription,
    status: defaultStatus,
    priority: initialPriority,
    task_type: "general",
    scheduling_mode: "manual",
    due_date: undefined as Date | undefined,
    estimated_duration_minutes: 30,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["task-dialog-profiles", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, avatar_url").neq("id", user?.id || "").limit(50);
      return data || [];
    },
    enabled: open,
  });

  const { data: objectives = [] } = useQuery({
    queryKey: ["task-dialog-objectives"],
    queryFn: async () => {
      const { data } = await supabase.from("club_objectives").select("id, title, status").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: open,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["task-dialog-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("marketplace_projects").select("id, title, status").eq("status", "active").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: open,
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ["task-dialog-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("unified_tasks").select("id, title, status, task_number").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
    enabled: open,
  });

  const { data: availableJobs = [] } = useQuery({
    queryKey: ["task-dialog-jobs"],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("id, title, company_id, companies(name)").in("status", ["open", "published", "active"]).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: open && !jobId,
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title.trim()) return;

    setLoading(true);
    try {
      // Auto-create objective for job if needed
      const effectiveJobId = selectedJobId || jobId || null;
      const effectiveCompanyId = selectedCompanyId || companyId || null;
      const effectiveJobTitle = effectiveJobId ? (availableJobs.find((j: any) => j.id === effectiveJobId)?.title || jobTitle || 'Job') : null;
      let effectiveObjectiveId = selectedObjective || null;
      if (effectiveJobId && !effectiveObjectiveId) {
        // Check if an objective already exists for this job
        const { data: existingObj } = await supabase
          .from("club_objectives")
          .select("id")
          .eq("job_id", effectiveJobId)
          .maybeSingle();

        if (existingObj) {
          effectiveObjectiveId = existingObj.id;
        } else {
          // Create a new objective for this job
          const { data: newObj } = await supabase
            .from("club_objectives")
            .insert({
              title: `Tasks for ${effectiveJobTitle || 'Job'}`,
              status: "active",
              created_by: user.id,
              job_id: effectiveJobId,
              company_id: effectiveCompanyId,
            })
            .select("id")
            .single();
          if (newObj) effectiveObjectiveId = newObj.id;
        }
      }

      // Create the task
      const { data: task, error: taskError } = await supabase
        .from("unified_tasks")
        .insert([{
          task_number: '',
          title: formData.title,
          description: formData.description || null,
          status: formData.status,
          priority: formData.priority,
          task_type: formData.task_type,
          scheduling_mode: formData.scheduling_mode,
          due_date: formData.due_date?.toISOString() || null,
          estimated_duration_minutes: formData.estimated_duration_minutes,

          objective_id: effectiveObjectiveId,
          project_id: selectedProject || null,
          board_id: currentBoard?.id || null,
          job_id: effectiveJobId,
          company_id: effectiveCompanyId,
          user_id: user.id,
          created_by: user.id,
        }])
        .select()
        .single();

      if (taskError) throw taskError;

      // Create blocking dependencies (tasks that THIS task blocks)
      if (blockingTasks.length > 0) {
        const blockingDeps = blockingTasks.map(blockedTaskId => ({
          task_id: blockedTaskId,
          depends_on_task_id: task.id,
          created_by: user.id
        }));

        const { error: blockingError } = await supabase
          .from("task_dependencies")
          .insert(blockingDeps);

        if (blockingError) console.error("Error creating blocking deps:", blockingError);
      }

      // Create blocked-by dependencies (tasks that block THIS task)
      if (blockedByTasks.length > 0) {
        const blockedByDeps = blockedByTasks.map(blockingTaskId => ({
          task_id: task.id,
          depends_on_task_id: blockingTaskId,
          created_by: user.id
        }));

        const { error: blockedByError } = await supabase
          .from("task_dependencies")
          .insert(blockedByDeps);

        if (blockedByError) console.error("Error creating blocked-by deps:", blockedByError);
      }

      // Collect all assignees
      const allAssignees: string[] = [];
      if (assignToSelf) {
        allAssignees.push(user.id);
      }
      allAssignees.push(...selectedAssignees);

      // Assign users
      if (allAssignees.length > 0) {
        const assigneeInserts = allAssignees.map(userId => ({
          task_id: task.id,
          user_id: userId,
        }));

        const { error: assignError } = await supabase
          .from("unified_task_assignees")
          .insert(assigneeInserts);

        if (assignError) throw assignError;
      }

      toast.success(t('tasks.taskCreatedSuccessfully', 'Task created successfully!'));
      setOpen(false);
      resetForm();
      onTaskCreated();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error(t('tasks.failedToCreateTask', 'Failed to create task'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      status: defaultStatus,
      priority: "medium",
      task_type: "general",
      scheduling_mode: "manual",
      due_date: undefined,
      estimated_duration_minutes: 30,
    });
    setSelectedAssignees([]);
    setAssignToSelf(true);
    setShowAssignOthers(false);
    setAssigneeSearch("");
    setBlockingTasks([]);
    setBlockedByTasks([]);

    setSelectedObjective(undefined);
    setSelectedProject(undefined);
    if (!jobId) {
      setSelectedJobId(undefined);
      setSelectedCompanyId(undefined);
    }
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const removeAssignee = (userId: string) => {
    setSelectedAssignees(prev => prev.filter(id => id !== userId));
  };

  const getSelectedProfiles = () => {
    return profiles.filter(p => selectedAssignees.includes(p.id));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('tasks.createNewTask', 'Create New Task')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">{t('tasks.titleRequired', 'Title *')}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">{t('tasks.description', 'Description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="objective">{t('tasks.objectiveOptional', 'Objective (Optional)')}</Label>
            <Select value={selectedObjective || "none"} onValueChange={(val) => setSelectedObjective(val === "none" ? undefined : val)}>
              <SelectTrigger>
                <SelectValue placeholder={t('tasks.selectObjective', 'Select objective')} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="none">{t('tasks.noObjective', 'No objective')}</SelectItem>
                {objectives.map((obj) => (
                  <SelectItem key={obj.id} value={obj.id}>
                    {obj.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="project">{t('tasks.projectOptional', 'Project (Optional)')}</Label>
            <Select value={selectedProject || "none"} onValueChange={(val) => setSelectedProject(val === "none" ? undefined : val)}>
              <SelectTrigger>
                <SelectValue placeholder={t('tasks.selectProject', 'Select project')} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="none">{t('tasks.noProject', 'No project')}</SelectItem>
                {projects.map((proj) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3 w-3 text-muted-foreground" />
                      <span>{proj.title}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Link to Job — only shown when not pre-filled from Job Dashboard */}
          {!jobId && (
            <div>
              <Label htmlFor="linked-job">{t('tasks.linkToJobOptional', 'Link to Job (Optional)')}</Label>
              <Select
                value={selectedJobId || "none"}
                onValueChange={(val) => {
                  const jid = val === "none" ? undefined : val;
                  setSelectedJobId(jid);
                  if (jid) {
                    const foundJob = availableJobs.find((j: any) => j.id === jid);
                    if (foundJob?.company_id) setSelectedCompanyId(foundJob.company_id);
                  } else {
                    setSelectedCompanyId(undefined);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('tasks.selectAJob', 'Select a job')} />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="none">{t('tasks.noJobLinked', 'No job linked')}</SelectItem>
                  {availableJobs.map((j: any) => (
                    <SelectItem key={j.id} value={j.id}>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                        <span>{j.title}</span>
                        {j.companies?.name && (
                          <span className="text-muted-foreground text-xs">• {j.companies.name}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">{t('tasks.status', 'Status')}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="pending">{t('tasks.pending', 'Pending')}</SelectItem>
                  <SelectItem value="in_progress">{t('tasks.inProgress', 'In Progress')}</SelectItem>
                  <SelectItem value="on_hold">{t('tasks.onHold', 'On Hold')}</SelectItem>
                  <SelectItem value="completed">{t('tasks.completed', 'Completed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">{t('tasks.priority', 'Priority')}</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="low">{t('tasks.low', 'Low')}</SelectItem>
                  <SelectItem value="medium">{t('tasks.medium', 'Medium')}</SelectItem>
                  <SelectItem value="high">{t('tasks.high', 'High')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="task_type">{t('tasks.taskType', 'Task Type')}</Label>
              <Select
                value={formData.task_type}
                onValueChange={(value) => setFormData({ ...formData, task_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="general">{t('tasks.general', 'General')}</SelectItem>
                  <SelectItem value="interview_prep">{t('tasks.interviewPrep', 'Interview Prep')}</SelectItem>
                  <SelectItem value="application">{t('tasks.application', 'Application')}</SelectItem>
                  <SelectItem value="follow_up">{t('tasks.followUp', 'Follow Up')}</SelectItem>
                  <SelectItem value="research">{t('tasks.research', 'Research')}</SelectItem>
                  <SelectItem value="meeting">{t('tasks.meeting', 'Meeting')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="scheduling_mode">{t('tasks.scheduling', 'Scheduling')}</Label>
              <Select
                value={formData.scheduling_mode}
                onValueChange={(value) => setFormData({ ...formData, scheduling_mode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="manual">{t('tasks.manual', 'Manual')}</SelectItem>
                  <SelectItem value="ai">{t('tasks.aiScheduled', 'AI Scheduled')}</SelectItem>
                  <SelectItem value="hybrid">{t('tasks.hybrid', 'Hybrid')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('tasks.dueDate', 'Due Date')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(formData.due_date, "PPP") : <span>{t('tasks.pickADate', 'Pick a date')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover z-50">
                  <Calendar
                    mode="single"
                    selected={formData.due_date}
                    onSelect={(date) => setFormData({ ...formData, due_date: date })}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="duration">{t('tasks.durationMinutes', 'Duration (minutes)')}</Label>
              <Input
                id="duration"
                type="number"
                min="5"
                step="5"
                value={formData.estimated_duration_minutes}
                onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) || 30 })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>{t('tasks.assignTo', 'Assign To')}</Label>

            {/* Assign to myself button */}
            <Button
              type="button"
              variant={assignToSelf ? "default" : "outline"}
              size="sm"
              onClick={() => setAssignToSelf(!assignToSelf)}
              className="w-full gap-2"
            >
              <User className="h-4 w-4" />
              {assignToSelf ? t('tasks.assignedToMyself', 'Assigned to myself') : t('tasks.assignToMyself', 'Assign to myself')}
            </Button>

            {/* Assign to others button */}
            <Button
              type="button"
              variant={showAssignOthers ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAssignOthers(!showAssignOthers)}
              className="w-full gap-2"
            >
              <Users className="h-4 w-4" />
              {t('tasks.assignToOthers', 'Assign to others')}
            </Button>

            {/* Selected assignees */}
            {selectedAssignees.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {getSelectedProfiles().map((profile) => (
                  <Badge key={profile.id} variant="secondary" className="gap-2">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {profile.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{profile.full_name}</span>
                    <button
                      type="button"
                      onClick={() => removeAssignee(profile.id)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Dropdown for selecting others */}
            {showAssignOthers && (() => {
              const filteredProfiles = assigneeSearch.trim()
                ? profiles.filter(p => p.full_name?.toLowerCase().includes(assigneeSearch.toLowerCase()))
                : profiles;
              return (
                <div className="space-y-2 border rounded-lg p-3 bg-card">
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('tasks.searchByName', 'Search by name...')}
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      className="pl-9 h-9 text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredProfiles.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">{t('tasks.noResultsFound', 'No results found')}</p>
                    ) : (
                      filteredProfiles.map((profile) => (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => toggleAssignee(profile.id)}
                          className={`flex items-center gap-3 w-full p-2 rounded hover:bg-accent transition-colors ${selectedAssignees.includes(profile.id) ? "bg-accent" : ""}`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback>{profile.full_name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm flex-1 text-left">{profile.full_name || "Unknown"}</span>
                          {selectedAssignees.includes(profile.id) && (
                            <Badge variant="default" className="text-xs">{t('tasks.selected', 'Selected')}</Badge>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="space-y-3">
            <Label>{t('tasks.blockingOptional', 'Blocking (Optional)')}</Label>
            <p className="text-xs text-muted-foreground">{t('tasks.tasksThisBlocks', 'Tasks that THIS task blocks')}</p>
            <Select
              value=""
              onValueChange={(value) => {
                if (value && !blockingTasks.includes(value)) {
                  setBlockingTasks([...blockingTasks, value]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('tasks.selectTasksToBlock', 'Select tasks to block')} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {allTasks
                  .filter(t => !blockingTasks.includes(t.id))
                  .map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.task_number} - {task.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {blockingTasks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {blockingTasks.map(taskId => {
                  const task = allTasks.find(t => t.id === taskId);
                  return task ? (
                    <Badge key={taskId} variant="secondary" className="gap-1">
                      {task.task_number}
                      <button
                        type="button"
                        onClick={() => setBlockingTasks(blockingTasks.filter(id => id !== taskId))}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>{t('tasks.blockedByOptional', 'Blocked By (Optional)')}</Label>
            <p className="text-xs text-muted-foreground">{t('tasks.tasksThatBlockThis', 'Tasks that block THIS task')}</p>
            <Select
              value=""
              onValueChange={(value) => {
                if (value && !blockedByTasks.includes(value)) {
                  setBlockedByTasks([...blockedByTasks, value]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('tasks.selectBlockingTasks', 'Select blocking tasks')} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {allTasks
                  .filter(t => !blockedByTasks.includes(t.id))
                  .map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.task_number} - {task.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {blockedByTasks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {blockedByTasks.map(taskId => {
                  const task = allTasks.find(t => t.id === taskId);
                  return task ? (
                    <Badge key={taskId} variant="secondary" className="gap-1">
                      {task.task_number}
                      <button
                        type="button"
                        onClick={() => setBlockedByTasks(blockedByTasks.filter(id => id !== taskId))}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t('tasks.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('tasks.creating', 'Creating...') : t('tasks.createTask', 'Create Task')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
