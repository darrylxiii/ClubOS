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

interface QuickTaskDialogProps {
  open: boolean;
  onClose: () => void;
}

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-muted text-muted-foreground" },
  { value: "medium", label: "Med", color: "bg-warning/20 text-warning" },
  { value: "high", label: "High", color: "bg-destructive/20 text-destructive" },
] as const;

export const QuickTaskDialog = ({ open, onClose }: QuickTaskDialogProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user?.id) return;

    setIsSubmitting(true);
    try {
      // Map priority string to a numeric score for pilot_tasks
      const priorityScores: Record<string, number> = { low: 30, medium: 60, high: 90 };

      const { error } = await supabase.from("pilot_tasks").insert({
        user_id: user.id,
        title: title.trim(),
        priority_score: priorityScores[priority] || 60,
        status: "pending",
        task_type: "manual",
      });

      if (error) throw error;

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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Quick Task</DialogTitle>
          <DialogDescription>Create a task instantly.</DialogDescription>
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
