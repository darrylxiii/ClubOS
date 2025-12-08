import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TimeEntryData } from "@/hooks/useTimeTracking";

interface EditTimeEntryDialogProps {
  entry: TimeEntryData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTimeEntryDialog({ entry, open, onOpenChange }: EditTimeEntryDialogProps) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isBillable, setIsBillable] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [hourlyRate, setHourlyRate] = useState<number | null>(null);

  // Fetch projects for dropdown
  const { data: projects } = useQuery({
    queryKey: ["tracking-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracking_projects")
        .select("id, name, color")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch tasks for selected project
  const { data: tasks } = useQuery({
    queryKey: ["tracking-tasks", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("tracking_tasks")
        .select("id, name")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      setDescription(entry.description || "");
      setProjectId(entry.project_id);
      setTaskId(entry.task_id);
      setIsBillable(entry.is_billable);
      setHourlyRate(entry.hourly_rate || null);
      
      if (entry.start_time) {
        const start = new Date(entry.start_time);
        setStartDate(start);
        setStartTime(format(start, "HH:mm"));
      }
      
      if (entry.end_time) {
        const end = new Date(entry.end_time);
        setEndTime(format(end, "HH:mm"));
      }
    }
  }, [entry]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<TimeEntryData>) => {
      if (!entry?.id) throw new Error("No entry to update");
      
      const { error } = await supabase
        .from("time_entries")
        .update(updates)
        .eq("id", entry.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success("Time entry updated");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const handleSave = () => {
    if (!startDate || !entry) return;

    // Construct start and end times
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startDateTime = new Date(startDate);
    startDateTime.setHours(startHour, startMin, 0, 0);

    const endDateTime = new Date(startDate);
    endDateTime.setHours(endHour, endMin, 0, 0);

    // Calculate duration
    const durationSeconds = Math.floor((endDateTime.getTime() - startDateTime.getTime()) / 1000);

    if (durationSeconds <= 0) {
      toast.error("End time must be after start time");
      return;
    }

    updateMutation.mutate({
      description: description || null,
      project_id: projectId,
      task_id: taskId,
      is_billable: isBillable,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      duration_seconds: durationSeconds,
      hourly_rate: hourlyRate,
    });
  };

  const formatDuration = () => {
    if (!startDate) return "0h 0m";
    
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    
    const totalMins = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    if (totalMins <= 0) return "Invalid";
    
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What were you working on?"
              className="min-h-[80px]"
            />
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label>Project</Label>
            <Select
              value={projectId || ""}
              onValueChange={(val) => {
                setProjectId(val || null);
                setTaskId(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No project</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: project.color || "#6b7280" }}
                      />
                      {project.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task */}
          {projectId && tasks && tasks.length > 0 && (
            <div className="space-y-2">
              <Label>Task</Label>
              <Select
                value={taskId || ""}
                onValueChange={(val) => setTaskId(val || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No task</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Start</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>End</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Duration display */}
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <span className="text-sm text-muted-foreground">Duration: </span>
            <span className="font-semibold">{formatDuration()}</span>
          </div>

          {/* Hourly Rate */}
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Hourly Rate (€)</Label>
            <Input
              id="hourlyRate"
              type="number"
              min="0"
              step="0.01"
              value={hourlyRate ?? ""}
              onChange={(e) => setHourlyRate(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="0.00"
            />
          </div>

          {/* Billable toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
            <div>
              <Label htmlFor="billable" className="text-base">Billable</Label>
              <p className="text-sm text-muted-foreground">Mark as billable time</p>
            </div>
            <Switch
              id="billable"
              checked={isBillable}
              onCheckedChange={setIsBillable}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
