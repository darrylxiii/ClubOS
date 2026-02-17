import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAttendeeProfiles } from "@/hooks/useAttendeeProfiles";
import { DashboardWidget } from "./DashboardWidget";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, CheckCircle2, ArrowRight, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
  startOfDay,
} from "date-fns";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  is_overdue: boolean | null;
  assignees: { user_id: string; email?: string }[];
}

function useDueDateLabel(dueDate: string | null, isOverdue: boolean | null) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = startOfDay(new Date());
  const diff = differenceInCalendarDays(due, today);

  if (isOverdue || diff < 0) {
    const absDiff = Math.abs(diff);
    return {
      text: absDiff === 0 ? "Due today" : `${absDiff}d overdue`,
      className: "text-red-400",
    };
  }
  if (diff === 0) return { text: "Due today", className: "text-amber-400" };
  if (diff === 1) return { text: "Due tomorrow", className: "text-amber-300" };
  if (diff <= 6) return { text: `Due ${format(due, "EEE")}`, className: "text-muted-foreground" };
  return { text: format(due, "MMM d"), className: "text-muted-foreground" };
}

const PriorityBadge = ({ priority }: { priority: string }) => {
  const config: Record<string, { label: string; className: string }> = {
    high: { label: "High", className: "bg-red-500/15 text-red-400 border-red-500/20" },
    medium: { label: "Med", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
    low: { label: "Low", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  };
  const c = config[priority] || config.low;
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 font-medium", c.className)}>
      {c.label}
    </Badge>
  );
};

const AssigneeStack = ({ emails }: { emails: string[] }) => {
  const { profileMap } = useAttendeeProfiles(emails);
  if (emails.length === 0) return null;
  const shown = emails.slice(0, 3);
  const extra = emails.length - 3;

  return (
    <div className="flex -space-x-1.5">
      {shown.map((email) => {
        const p = profileMap.get(email.toLowerCase());
        const initials = (p?.full_name || email)
          .split(/[\s@]/)
          .filter(Boolean)
          .slice(0, 2)
          .map((s) => s[0]?.toUpperCase())
          .join("");
        return (
          <Avatar key={email} className="h-5 w-5 border border-background">
            {p?.avatar_url && <AvatarImage src={p.avatar_url} alt={p.full_name || email} />}
            <AvatarFallback className="text-[8px] bg-muted">{initials}</AvatarFallback>
          </Avatar>
        );
      })}
      {extra > 0 && (
        <Avatar className="h-5 w-5 border border-background">
          <AvatarFallback className="text-[8px] bg-muted">+{extra}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

const TaskItem = ({
  task,
  onComplete,
  isCompleting,
}: {
  task: TaskRow;
  onComplete: (id: string) => void;
  isCompleting: boolean;
}) => {
  const dueLabel = useDueDateLabel(task.due_date, task.is_overdue);
  const assigneeEmails = task.assignees
    .map((a) => a.email)
    .filter((e): e is string => !!e);

  return (
    <div
      className={cn(
        "group flex items-center gap-2 py-2 px-1 rounded-lg transition-colors hover:bg-muted/30",
        isCompleting && "opacity-50 pointer-events-none",
      )}
    >
      <button
        onClick={() => onComplete(task.id)}
        className="flex-shrink-0 text-muted-foreground hover:text-emerald-400 transition-colors"
        aria-label="Complete task"
      >
        <CheckCircle2 className="h-4 w-4" />
      </button>

      <span className="flex-1 text-sm truncate">{task.title}</span>

      <AssigneeStack emails={assigneeEmails} />
      <PriorityBadge priority={task.priority} />

      {dueLabel && (
        <span className={cn("text-[11px] font-medium whitespace-nowrap tabular-nums", dueLabel.className)}>
          {dueLabel.text}
        </span>
      )}
    </div>
  );
};

export const AdminTasksWidget = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch top 7 incomplete tasks for current user
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["admin-action-items", user?.id],
    queryFn: async (): Promise<TaskRow[]> => {
      if (!user) return [];

      // Get task IDs where user is assigned
      const { data: assignments } = await supabase
        .from("unified_task_assignees")
        .select("task_id")
        .eq("user_id", user.id);

      const assignedIds = assignments?.map((a) => a.task_id) || [];

      // Also include tasks created by user
      let query = supabase
        .from("unified_tasks")
        .select("id, title, status, priority, due_date, is_overdue")
        .not("status", "in", '("completed","cancelled")')
        .order("is_overdue", { ascending: false, nullsFirst: false })
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(20);

      // Filter: assigned OR created by
      if (assignedIds.length > 0) {
        query = query.or(`created_by.eq.${user.id},id.in.(${assignedIds.join(",")})`);
      } else {
        query = query.eq("created_by", user.id);
      }

      const { data: rawTasks, error } = await query;
      if (error) throw error;
      if (!rawTasks || rawTasks.length === 0) return [];

      // Sort by priority within the DB-ordered results
      const sorted = rawTasks
        .sort((a, b) => {
          // Already ordered by is_overdue desc, due_date asc from DB
          // Secondary sort by priority
          if (a.is_overdue === b.is_overdue && a.due_date === b.due_date) {
            return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
          }
          return 0;
        })
        .slice(0, 7);

      // Fetch assignees for these tasks
      const taskIds = sorted.map((t) => t.id);
      const { data: allAssignees } = await supabase
        .from("unified_task_assignees")
        .select("task_id, user_id")
        .in("task_id", taskIds);

      // Resolve assignee emails from profiles
      const assigneeUserIds = [...new Set(allAssignees?.map((a) => a.user_id) || [])];
      let emailMap = new Map<string, string>();
      if (assigneeUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", assigneeUserIds);
        if (profiles) {
          emailMap = new Map(profiles.map((p) => [p.id, p.email]));
        }
      }

      return sorted.map((t) => ({
        ...t,
        assignees: (allAssignees || [])
          .filter((a) => a.task_id === t.id)
          .map((a) => ({ user_id: a.user_id, email: emailMap.get(a.user_id) })),
      }));
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Streak: count of tasks completed today
  const { data: streakCount = 0 } = useQuery({
    queryKey: ["admin-task-streak", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const todayStart = startOfDay(new Date()).toISOString();
      const { count } = await supabase
        .from("unified_tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("completed_at", todayStart)
        .or(`created_by.eq.${user.id}`);
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("unified_tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", taskId);
      if (error) throw error;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ["admin-action-items"] });
      const prev = queryClient.getQueryData<TaskRow[]>(["admin-action-items", user?.id]);
      queryClient.setQueryData<TaskRow[]>(
        ["admin-action-items", user?.id],
        (old) => old?.filter((t) => t.id !== taskId) ?? [],
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(["admin-action-items", user?.id], context?.prev);
      toast.error("Failed to complete task");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-action-items"] });
      queryClient.invalidateQueries({ queryKey: ["admin-task-streak"] });
    },
  });

  const streakBadge =
    streakCount > 0 ? (
      <div className="flex items-center gap-1 text-emerald-400">
        <Flame className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{streakCount} done today</span>
      </div>
    ) : null;

  return (
    <DashboardWidget
      title="Action Items"
      icon={Target}
      iconClassName="text-primary"
      isLoading={isLoading}
      isEmpty={tasks.length === 0}
      emptyMessage="All caught up — no pending tasks"
      headerAction={streakBadge}
    >
      <div className="space-y-0.5 -mx-1">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onComplete={(id) => completeMutation.mutate(id)}
            isCompleting={completeMutation.isPending && completeMutation.variables === task.id}
          />
        ))}
      </div>

      <div className="pt-3 border-t border-border/40 mt-3">
        <Button variant="ghost" size="sm" asChild className="w-full text-muted-foreground hover:text-foreground">
          <Link to="/tasks">
            Open Task Board
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      </div>
    </DashboardWidget>
  );
};
