import { useState, useEffect, useCallback } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, CalendarDays, ArrowUp, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface QuickAddTaskProps {
  objectiveId?: string | null;
  onTaskCreated: () => void;
}

export function QuickAddTask({ objectiveId, onTaskCreated }: QuickAddTaskProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [objectives, setObjectives] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    loadObjectives();
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const loadObjectives = async () => {
    try {
      const { data } = await supabase
        .from("club_objectives")
        .select("id, title")
        .order("created_at", { ascending: false })
        .limit(10);
      setObjectives(data || []);
    } catch (error) {
      console.error("Error loading objectives:", error);
    }
  };

  const parseTaskInput = (input: string) => {
    let title = input;
    let priority = "medium";
    let dueDate: string | null = null;

    // Parse priority markers
    if (input.includes("!urgent") || input.includes("!!")) {
      priority = "urgent";
      title = title.replace(/!urgent|!!/g, "").trim();
    } else if (input.includes("!high") || input.includes("!")) {
      priority = "high";
      title = title.replace(/!high|!/g, "").trim();
    } else if (input.includes("!low")) {
      priority = "low";
      title = title.replace(/!low/g, "").trim();
    }

    // Parse due date markers
    const todayMatch = input.match(/@today/i);
    const tomorrowMatch = input.match(/@tomorrow/i);
    const dateMatch = input.match(/@(\d{1,2}\/\d{1,2})/);

    if (todayMatch) {
      dueDate = new Date().toISOString().split("T")[0];
      title = title.replace(/@today/i, "").trim();
    } else if (tomorrowMatch) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dueDate = tomorrow.toISOString().split("T")[0];
      title = title.replace(/@tomorrow/i, "").trim();
    } else if (dateMatch) {
      const [month, day] = dateMatch[1].split("/");
      const year = new Date().getFullYear();
      dueDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      title = title.replace(/@\d{1,2}\/\d{1,2}/, "").trim();
    }

    return { title, priority, dueDate };
  };

  const createTask = async (selectedObjectiveId?: string) => {
    if (!title.trim() || !user) return;

    setCreating(true);
    try {
      const { title: parsedTitle, priority, dueDate } = parseTaskInput(title);

      // Generate task number
      const { count } = await supabase
        .from("unified_tasks")
        .select("*", { count: "exact", head: true });

      const taskNumber = `TQ-${String((count || 0) + 1).padStart(4, "0")}`;

      const { data, error } = await supabase
        .from("unified_tasks")
        .insert({
          title: parsedTitle,
          task_number: taskNumber,
          priority,
          due_date: dueDate,
          status: "pending",
          objective_id: selectedObjectiveId || objectiveId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as assignee
      await supabase.from("unified_task_assignees").insert({
        task_id: data.id,
        user_id: user.id,
        assigned_by: user.id,
      });

      toast.success(`Task "${parsedTitle}" created`);
      setTitle("");
      setOpen(false);
      onTaskCreated();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Type a task... (use !high, !! for priority, @today for due date)"
        value={title}
        onValueChange={setTitle}
      />
      <CommandList>
        <CommandEmpty>
          {title ? (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Press Enter to create task
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {parseTaskInput(title).priority !== "medium" && (
                  <Badge variant="outline" className="gap-1">
                    <ArrowUp className="h-3 w-3" />
                    {parseTaskInput(title).priority}
                  </Badge>
                )}
                {parseTaskInput(title).dueDate && (
                  <Badge variant="outline" className="gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {parseTaskInput(title).dueDate}
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Start typing to create a task...
            </p>
          )}
        </CommandEmpty>

        {title && (
          <>
            <CommandGroup heading="Quick Create">
              <CommandItem
                onSelect={() => createTask()}
                disabled={creating}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create "{parseTaskInput(title).title}"</span>
                <Badge variant="secondary" className="ml-auto">
                  Enter
                </Badge>
              </CommandItem>
            </CommandGroup>

            {objectives.length > 0 && (
              <CommandGroup heading="Add to Objective">
                {objectives.map((obj) => (
                  <CommandItem
                    key={obj.id}
                    onSelect={() => createTask(obj.id)}
                    disabled={creating}
                    className="gap-2"
                  >
                    <Target className="h-4 w-4" />
                    <span>Add to {obj.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}

        {!title && (
          <CommandGroup heading="Tips">
            <CommandItem disabled className="opacity-70">
              <Zap className="h-4 w-4 mr-2" />
              <span>Use <code className="bg-muted px-1 rounded">!high</code> or <code className="bg-muted px-1 rounded">!!</code> for priority</span>
            </CommandItem>
            <CommandItem disabled className="opacity-70">
              <CalendarDays className="h-4 w-4 mr-2" />
              <span>Use <code className="bg-muted px-1 rounded">@today</code> or <code className="bg-muted px-1 rounded">@tomorrow</code> for due dates</span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
