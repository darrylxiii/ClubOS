import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { isToday, isTomorrow, format } from "date-fns";
import { useTranslation } from "react-i18next";

/**
 * Invisible component that checks for due-today / overdue tasks on mount
 * and shows a toast notification. Runs once per session.
 */
export function DueDateReminder() {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!user || hasRun.current) return;
    hasRun.current = true;

    const check = async () => {
      try {
        const { data, error } = await supabase
          .from("unified_tasks")
          .select("id, title, due_date, status")
          .or(`status.eq.pending,status.eq.in_progress`)
          .not("due_date", "is", null)
          .order("due_date", { ascending: true })
          .limit(50);

        if (error || !data) return;

        const now = new Date();
        const dueToday = data.filter(
          (t) => t.due_date && isToday(new Date(t.due_date))
        );
        const overdue = data.filter(
          (t) => t.due_date && new Date(t.due_date) < now && !isToday(new Date(t.due_date))
        );
        const dueTomorrow = data.filter(
          (t) => t.due_date && isTomorrow(new Date(t.due_date))
        );

        if (overdue.length > 0) {
          toast.warning(t('tasks.reminders.overdueTasks', { count: overdue.length }), {
            description: overdue
              .slice(0, 3)
              .map((t) => t.title)
              .join(", "),
            duration: 8000,
          });
        }

        if (dueToday.length > 0) {
          toast.info(`${dueToday.length} task${dueToday.length > 1 ? "s" : ""} due today`, {
            description: dueToday
              .slice(0, 3)
              .map((t) => t.title)
              .join(", "),
            duration: 6000,
          });
        }

        if (dueTomorrow.length > 0 && overdue.length === 0 && dueToday.length === 0) {
          toast.info(`${dueTomorrow.length} task${dueTomorrow.length > 1 ? "s" : ""} due tomorrow`, {
            duration: 5000,
          });
        }
      } catch {
        // silent
      }
    };

    // Small delay so it doesn't compete with page load
    const timer = setTimeout(check, 2000);
    return () => clearTimeout(timer);
  }, [user]);

  return null;
}
