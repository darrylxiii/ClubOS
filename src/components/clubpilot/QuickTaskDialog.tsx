import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Maximize2 } from "lucide-react";

interface QuickTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onExpand?: (title: string, priority: string) => void;
}

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-muted text-muted-foreground" },
  { value: "medium", label: "Med", color: "bg-warning/20 text-warning" },
  { value: "high", label: "High", color: "bg-destructive/20 text-destructive" },
] as const;

export const QuickTaskDialog = ({ open, onClose, onExpand }: QuickTaskDialogProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user?.id) return;

    setIsSubmitting(true);
    try {
      const { data: task, error } = await supabase.from("unified_tasks").insert({
        user_id: user.id,
        created_by: user.id,
        title: title.trim(),
        priority,
        status: "pending",
        task_type: "general",
        scheduling_mode: "manual",
        task_number: "",
      }).select("id").single();

      if (error) throw error;

      // Auto-assign to self
      if (task) {
        await supabase.from("unified_task_assignees").insert({
          task_id: task.id,
          user_id: user.id,
        });
      }

      toast.success("Task created");
      setTitle("");
      setPriority("medium");
      onClose();
    } catch (err) {
      console.error("Quick task create error:", err);
      toast.error("Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExpand = () => {
    const currentTitle = title;
    const currentPriority = priority;
    setTitle("");
    setPriority("medium");
    onClose();
    onExpand?.(currentTitle, currentPriority);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Quick Task</DialogTitle>
              <DialogDescription>Create a task instantly.</DialogDescription>
            </div>
            {onExpand && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 min-h-0 min-w-0 shrink-0"
                onClick={handleExpand}
                title="Open full task editor"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="text-sm"
          />
          <div className="flex gap-1.5">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                  priority === p.value
                    ? p.color + " ring-1 ring-border"
                    : "bg-card/30 text-muted-foreground hover:bg-card/50"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={isSubmitting}
            disabled={!title.trim()}
          >
            Create Task
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
