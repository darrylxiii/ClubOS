import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CreateClubTaskDialogProps {
  objectiveId: string;
  defaultStatus?: string;
  children: React.ReactNode;
  onTaskCreated: () => void;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface ClubTask {
  id: string;
  task_number: string;
  title: string;
}

export const CreateClubTaskDialog = ({ 
  objectiveId, 
  defaultStatus = "to_do",
  children, 
  onTaskCreated 
}: CreateClubTaskDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [existingTasks, setExistingTasks] = useState<ClubTask[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedBlockers, setSelectedBlockers] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: defaultStatus,
    priority: "medium",
    due_date: "",
  });

  useEffect(() => {
    if (open) {
      loadProfiles();
      loadExistingTasks();
    }
  }, [open, objectiveId]);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .order("full_name");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  const loadExistingTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("club_tasks")
        .select("id, task_number, title")
        .eq("objective_id", objectiveId)
        .order("task_number");

      if (error) throw error;
      setExistingTasks(data || []);
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Create the task
      const { data: task, error: taskError } = await supabase
        .from("club_tasks")
        .insert([{
          objective_id: objectiveId,
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          due_date: formData.due_date || null,
          created_by: user.id,
          task_number: '',
        }])
        .select()
        .single();

      if (taskError) throw taskError;

      // Add assignees
      if (selectedAssignees.length > 0) {
        const assignees = selectedAssignees.map(userId => ({
          task_id: task.id,
          user_id: userId,
        }));

        const { error: assigneesError } = await supabase
          .from("task_assignees")
          .insert(assignees);

        if (assigneesError) throw assigneesError;
      }

      // Add blockers
      if (selectedBlockers.length > 0) {
        const blockers = selectedBlockers.map(blockingTaskId => ({
          blocked_task_id: task.id,
          blocking_task_id: blockingTaskId,
        }));

        const { error: blockersError } = await supabase
          .from("task_blockers")
          .insert(blockers);

        if (blockersError) throw blockersError;
      }

      toast.success("Task created successfully");
      setOpen(false);
      setFormData({
        title: "",
        description: "",
        status: defaultStatus,
        priority: "medium",
        due_date: "",
      });
      setSelectedAssignees([]);
      setSelectedBlockers([]);
      onTaskCreated();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleBlocker = (taskId: string) => {
    setSelectedBlockers(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Website Revamp"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the task..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blocked">🚫 Blocked</SelectItem>
                  <SelectItem value="parking_lot">🅿️ Parking Lot</SelectItem>
                  <SelectItem value="to_do">📋 To Do</SelectItem>
                  <SelectItem value="in_progress">🚀 In Progress</SelectItem>
                  <SelectItem value="on_hold">⏸️ On Hold</SelectItem>
                  <SelectItem value="completed">✅ Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Assign To</Label>
            <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
              {profiles.map(profile => (
                <div key={profile.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedAssignees.includes(profile.id)}
                    onCheckedChange={() => toggleAssignee(profile.id)}
                  />
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback>{profile.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{profile.full_name}</span>
                </div>
              ))}
            </div>
          </div>

          {existingTasks.length > 0 && (
            <div className="space-y-2">
              <Label>Blocked By (Select blocking tasks)</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                {existingTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedBlockers.includes(task.id)}
                      onCheckedChange={() => toggleBlocker(task.id)}
                    />
                    <span className="text-sm font-mono text-muted-foreground">{task.task_number}</span>
                    <span className="text-sm">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
