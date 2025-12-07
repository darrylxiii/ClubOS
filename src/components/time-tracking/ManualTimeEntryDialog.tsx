import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  date: z.date({
    required_error: "Date is required",
  }),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  project_id: z.string().optional(),
  task_id: z.string().optional(),
  description: z.string().optional(),
  is_billable: z.boolean().default(true),
}).refine((data) => {
  const start = new Date(`2000-01-01T${data.start_time}`);
  const end = new Date(`2000-01-01T${data.end_time}`);
  return end > start;
}, {
  message: "End time must be after start time",
  path: ["end_time"],
});

type FormData = z.infer<typeof formSchema>;

interface ManualTimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualTimeEntryDialog({
  open,
  onOpenChange,
}: ManualTimeEntryDialogProps) {
  const { projects, tasks, addManualEntry } = useTimeTracking();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      start_time: "09:00",
      end_time: "17:00",
      project_id: undefined,
      task_id: undefined,
      description: "",
      is_billable: true,
    },
  });

  // Filter tasks by selected project
  const filteredTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return tasks.filter(task => task.project_id === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const onSubmit = async (data: FormData) => {
    const dateStr = format(data.date, "yyyy-MM-dd");
    const startTime = `${dateStr}T${data.start_time}:00`;
    const endTime = `${dateStr}T${data.end_time}:00`;

    await addManualEntry.mutateAsync({
      start_time: startTime,
      end_time: endTime,
      project_id: data.project_id,
      task_id: data.task_id,
      description: data.description,
      is_billable: data.is_billable,
    });

    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Add Time Entry
          </DialogTitle>
          <DialogDescription>
            Log time for work you've already completed
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Date picker */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start & End time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Project selector */}
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedProjectId(value);
                      form.setValue("task_id", undefined);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: project.color }}
                            />
                            {project.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Task selector (filtered by project) */}
            {filteredTasks.length > 0 && (
              <FormField
                control={form.control}
                name="task_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a task (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredTasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What did you work on?"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Billable toggle */}
            <FormField
              control={form.control}
              name="is_billable"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">
                      Billable
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Mark this time as billable to client
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addManualEntry.isPending}>
                {addManualEntry.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Entry
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
