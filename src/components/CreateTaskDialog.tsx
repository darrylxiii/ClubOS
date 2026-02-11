import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar as CalendarIcon, Clock, Target, Briefcase, Sparkles, Repeat } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CreateTaskDialogProps {
  trigger?: React.ReactNode;
  onTaskCreated?: () => void;
}

const taskTypes = [
  { value: 'interview_prep', label: 'Interview Prep', icon: '📝' },
  { value: 'application', label: 'Application', icon: '📄' },
  { value: 'follow_up', label: 'Follow Up', icon: '📧' },
  { value: 'research', label: 'Company Research', icon: '🔍' },
  { value: 'meeting', label: 'Meeting', icon: '👥' },
  { value: 'networking', label: 'Networking', icon: '🤝' },
  { value: 'skill_development', label: 'Skill Development', icon: '📚' },
  { value: 'portfolio', label: 'Portfolio Update', icon: '💼' },
  { value: 'custom', label: 'Custom', icon: '✓' },
];

const priorities = [
  { value: 'urgent', label: 'Urgent', color: 'destructive' },
  { value: 'high', label: 'High', color: 'default' },
  { value: 'medium', label: 'Medium', color: 'secondary' },
  { value: 'low', label: 'Low', color: 'outline' },
];

const durations = [15, 30, 45, 60, 90, 120, 180, 240];

export const CreateTaskDialog = ({ trigger, onTaskCreated }: CreateTaskDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'custom',
    priority: 'medium',
    estimated_duration_minutes: 30,
    due_date: undefined as Date | undefined,
    company_name: '',
    position: '',
    recurring: false,
    recurrence_pattern: 'daily',
    auto_schedule: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description || null,
          task_type: formData.task_type,
          priority: formData.priority,
          estimated_duration_minutes: formData.estimated_duration_minutes,
          due_date: formData.due_date?.toISOString() || null,
          company_name: formData.company_name || null,
          position: formData.position || null,
          status: 'pending',
          metadata: {
            recurring: formData.recurring,
            recurrence_pattern: formData.recurrence_pattern,
            created_manually: true,
          }
        });

      if (error) throw error;

      toast.success(
        formData.auto_schedule 
          ? 'Task created! AI will schedule it automatically.' 
          : 'Task created successfully!'
      );
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        task_type: 'custom',
        priority: 'medium',
        estimated_duration_minutes: 30,
        due_date: undefined,
        company_name: '',
        position: '',
        recurring: false,
        recurrence_pattern: 'daily',
        auto_schedule: true,
      });

      setOpen(false);
      onTaskCreated?.();
    } catch (error: unknown) {
      console.error('Error creating task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a task to your pipeline. Motion-style AI will automatically schedule it based on your priorities and calendar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Prepare for Google interview"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add notes, requirements, or any additional details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task_type">Task Type</Label>
              <Select
                value={formData.task_type}
                onValueChange={(value) => setFormData({ ...formData, task_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <Badge variant={priority.color as any}>{priority.label}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estimated Duration</Label>
              <Select
                value={formData.estimated_duration_minutes.toString()}
                onValueChange={(value) => setFormData({ ...formData, estimated_duration_minutes: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durations.map((duration) => (
                    <SelectItem key={duration} value={duration.toString()}>
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {duration >= 60 ? `${duration / 60}h` : `${duration}min`}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.due_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(formData.due_date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.due_date}
                    onSelect={(date) => setFormData({ ...formData, due_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Company & Position (Optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company (Optional)</Label>
              <Input
                id="company_name"
                placeholder="e.g., Google"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position (Optional)</Label>
              <Input
                id="position"
                placeholder="e.g., Senior Engineer"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
          </div>

          {/* Recurring Task */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Repeat className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label className="text-base font-semibold">Recurring Task</Label>
                <p className="text-sm text-muted-foreground">Automatically create this task on a schedule</p>
              </div>
            </div>
            <Switch
              checked={formData.recurring}
              onCheckedChange={(checked) => setFormData({ ...formData, recurring: checked })}
            />
          </div>

          {formData.recurring && (
            <div className="space-y-2 pl-8">
              <Label>Recurrence Pattern</Label>
              <Select
                value={formData.recurrence_pattern}
                onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Auto-schedule */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-accent/5">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-accent" />
              <div>
                <Label className="text-base font-semibold">AI Auto-Schedule</Label>
                <p className="text-sm text-muted-foreground">
                  Let Motion-style AI find the best time for this task
                </p>
              </div>
            </div>
            <Switch
              checked={formData.auto_schedule}
              onCheckedChange={(checked) => setFormData({ ...formData, auto_schedule: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};