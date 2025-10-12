import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { Calendar as CalendarIcon, User, Users, X } from "lucide-react";
import { format } from "date-fns";

interface CreateUnifiedTaskDialogProps {
  objectiveId: string | null;
  defaultStatus?: string;
  children: React.ReactNode;
  onTaskCreated: () => void;
}

export const CreateUnifiedTaskDialog = ({
  objectiveId,
  defaultStatus = "pending",
  children,
  onTaskCreated,
}: CreateUnifiedTaskDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [assignToSelf, setAssignToSelf] = useState(true);
  const [showAssignOthers, setShowAssignOthers] = useState(false);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [selectedObjective, setSelectedObjective] = useState<string | undefined>(objectiveId || undefined);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [blockingTasks, setBlockingTasks] = useState<string[]>([]);
  const [blockedByTasks, setBlockedByTasks] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: defaultStatus,
    priority: "medium",
    task_type: "general",
    scheduling_mode: "manual",
    due_date: undefined as Date | undefined,
    estimated_duration_minutes: 30,
  });

  useEffect(() => {
    if (open) {
      loadProfiles();
      loadObjectives();
      loadTasks();
      setAssignToSelf(true);
      setSelectedAssignees([]);
      setShowAssignOthers(false);
      setSelectedObjective(objectiveId || undefined);
    }
  }, [open, objectiveId]);

  const loadObjectives = async () => {
    const { data } = await supabase
      .from("club_objectives")
      .select("id, title, status")
      .order("created_at", { ascending: false });
    
    if (data) setObjectives(data);
  };

  const loadTasks = async () => {
    const { data } = await supabase
      .from("unified_tasks")
      .select("id, title, status, task_number")
      .order("created_at", { ascending: false })
      .limit(100);
    
    if (data) setAllTasks(data);
  };

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .neq("id", user?.id || "")
        .limit(50);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title.trim()) return;

    setLoading(true);
    try {
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
          objective_id: selectedObjective || null,
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

      toast.success("Task created successfully!");
      setOpen(false);
      resetForm();
      onTaskCreated();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
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
    setBlockingTasks([]);
    setBlockedByTasks([]);
    setSelectedObjective(undefined);
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
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="objective">Objective (Optional)</Label>
            <Select value={selectedObjective || "none"} onValueChange={(val) => setSelectedObjective(val === "none" ? undefined : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select objective" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="none">No objective</SelectItem>
                {objectives.map((obj) => (
                  <SelectItem key={obj.id} value={obj.id}>
                    {obj.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="task_type">Task Type</Label>
              <Select
                value={formData.task_type}
                onValueChange={(value) => setFormData({ ...formData, task_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="interview_prep">Interview Prep</SelectItem>
                  <SelectItem value="application">Application</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="scheduling_mode">Scheduling</Label>
              <Select
                value={formData.scheduling_mode}
                onValueChange={(value) => setFormData({ ...formData, scheduling_mode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="ai">AI Scheduled</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(formData.due_date, "PPP") : <span>Pick a date</span>}
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
              <Label htmlFor="duration">Duration (minutes)</Label>
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
            <Label>Assign To</Label>
            
            {/* Assign to myself button */}
            <Button
              type="button"
              variant={assignToSelf ? "default" : "outline"}
              size="sm"
              onClick={() => setAssignToSelf(!assignToSelf)}
              className="w-full gap-2"
            >
              <User className="h-4 w-4" />
              {assignToSelf ? "✓ Assigned to myself" : "Assign to myself"}
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
              Assign to others
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
            {showAssignOthers && (
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3 bg-card">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => toggleAssignee(profile.id)}
                    className={`flex items-center gap-3 w-full p-2 rounded hover:bg-accent transition-colors ${
                      selectedAssignees.includes(profile.id) ? "bg-accent" : ""
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>{profile.full_name?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm flex-1 text-left">{profile.full_name || "Unknown"}</span>
                    {selectedAssignees.includes(profile.id) && (
                      <Badge variant="default" className="text-xs">Selected</Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Blocking (Optional)</Label>
            <p className="text-xs text-muted-foreground">Tasks that THIS task blocks</p>
            <Select 
              value="" 
              onValueChange={(value) => {
                if (value && !blockingTasks.includes(value)) {
                  setBlockingTasks([...blockingTasks, value]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tasks to block" />
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
            <Label>Blocked By (Optional)</Label>
            <p className="text-xs text-muted-foreground">Tasks that block THIS task</p>
            <Select 
              value="" 
              onValueChange={(value) => {
                if (value && !blockedByTasks.includes(value)) {
                  setBlockedByTasks([...blockedByTasks, value]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select blocking tasks" />
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
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
