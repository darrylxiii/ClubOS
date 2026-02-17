import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface FeedbackData {
  time_spent_minutes: number;
  difficulty_rating: number;
  outcome_rating: number | null;
  blockers: string[] | null;
  improvement_suggestions: string[] | null;
  notes: string | null;
  skipped: boolean;
}

interface PendingTask {
  id: string;
  title: string;
}

export function useTaskCompletion(options?: {
  /** Called after task is successfully completed */
  onCompleted?: (taskId: string) => void;
  /** Query keys to invalidate after completion */
  invalidateKeys?: string[][];
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pendingTask, setPendingTask] = useState<PendingTask | null>(null);

  const requestComplete = useCallback((taskId: string, taskTitle: string) => {
    setPendingTask({ id: taskId, title: taskTitle });
  }, []);

  const handleFeedbackSubmit = useCallback(
    async (feedback: FeedbackData) => {
      if (!pendingTask || !user) return;
      const taskId = pendingTask.id;

      try {
        // Insert feedback
        const { error: fbError } = await supabase
          .from("task_completion_feedback" as any)
          .insert({
            task_id: taskId,
            user_id: user.id,
            time_spent_minutes: feedback.time_spent_minutes,
            difficulty_rating: feedback.difficulty_rating,
            outcome_rating: feedback.outcome_rating,
            blockers: feedback.blockers,
            improvement_suggestions: feedback.improvement_suggestions,
            notes: feedback.notes,
            skipped: feedback.skipped,
          });

        if (fbError) {
          console.error("Feedback insert error:", fbError);
          // Don't block completion on feedback failure
        }

        // Complete the task
        const { error: taskError } = await supabase
          .from("unified_tasks")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", taskId);

        if (taskError) throw taskError;

        toast.success("Task completed");

        // Invalidate queries
        const defaultKeys = [
          ["admin-action-items"],
          ["admin-task-streak"],
          ["unified-tasks"],
        ];
        const keys = options?.invalidateKeys || defaultKeys;
        keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));

        options?.onCompleted?.(taskId);
      } catch (error) {
        console.error("Error completing task:", error);
        toast.error("Failed to complete task");
      } finally {
        setPendingTask(null);
      }
    },
    [pendingTask, user, queryClient, options],
  );

  const handleClose = useCallback(() => {
    setPendingTask(null);
  }, []);

  return {
    requestComplete,
    feedbackModalProps: pendingTask
      ? {
          open: true,
          taskTitle: pendingTask.title,
          onSubmit: handleFeedbackSubmit,
          onClose: handleClose,
        }
      : {
          open: false,
          taskTitle: "",
          onSubmit: handleFeedbackSubmit,
          onClose: handleClose,
        },
  };
}
