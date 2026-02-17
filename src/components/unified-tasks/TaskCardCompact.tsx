import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  MessageSquare,
  CheckSquare,
  Lock,
  Link2,
  CircleCheck,
  User,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskCardCompactProps {
  task: any;
  onClick: (task: any) => void;
  isFocused?: boolean;
  taskIndex?: number;
}

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

export const TaskCardCompact = ({
  task,
  onClick,
  isFocused,
  taskIndex,
}: TaskCardCompactProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id, data: task });

  const style = { transform: CSS.Translate.toString(transform) };

  const blockingCount = task.blockingCount || 0;
  const blockedByCount = task.blockedByCount || 0;
  const subtaskCount = task.subtaskCount || 0;
  const subtaskCompleted = task.subtaskCompleted || 0;
  const commentCount = task.commentCount || 0;
  const isReady = blockedByCount === 0 && blockingCount === 0;

  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && task.status !== "completed";
  const isDueToday = dueDate && isToday(dueDate);
  const isDueTomorrow = dueDate && isTomorrow(dueDate);

  const subtaskPct =
    subtaskCount > 0 ? Math.round((subtaskCompleted / subtaskCount) * 100) : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-task-index={taskIndex}
      className={cn(
        "group relative touch-none transition-colors duration-150",
        isDragging && "z-50 opacity-40",
        isFocused &&
          "ring-2 ring-primary ring-offset-1 ring-offset-background rounded-lg"
      )}
      onClick={() => onClick(task)}
    >
      <div
        className={cn(
          "flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer border bg-card transition-colors duration-150",
          "hover:border-primary/30",
          isOverdue
            ? "border-l-2 border-l-destructive border-t-border/20 border-r-border/20 border-b-border/20"
            : "border-border/20"
        )}
      >
        {/* Priority dot */}
        <div className="pt-1.5 shrink-0">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              PRIORITY_DOT[task.priority] || PRIORITY_DOT.low
            )}
            title={`${task.priority} priority`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Title line */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground truncate leading-tight group-hover:text-primary transition-colors">
              {task.title}
            </span>
            <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
              {task.task_number}
            </span>
          </div>

          {/* Meta line */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {/* Dependency indicators */}
            {blockedByCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-destructive font-medium" title={`Blocked by ${blockedByCount} task(s)`}>
                <Lock className="h-3 w-3" />
                {blockedByCount}
              </span>
            )}
            {blockingCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-amber-500 font-medium" title={`Blocking ${blockingCount} task(s)`}>
                <Link2 className="h-3 w-3" />
                {blockingCount}
              </span>
            )}
            {isReady && task.status !== "completed" && (
              <span className="inline-flex items-center gap-0.5 text-emerald-500" title="Ready to work">
                <CircleCheck className="h-3 w-3" />
              </span>
            )}

            {/* Due date */}
            {dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5",
                  isOverdue && "text-destructive font-medium",
                  isDueToday && !isOverdue && "text-amber-500",
                  isDueTomorrow && "text-primary"
                )}
              >
                <Calendar className="h-3 w-3" />
                {isOverdue
                  ? "Overdue"
                  : isDueToday
                  ? "Today"
                  : isDueTomorrow
                  ? "Tomorrow"
                  : format(dueDate, "MMM d")}
              </span>
            )}

            {/* Subtask progress */}
            {subtaskCount > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <CheckSquare className="h-3 w-3" />
                {subtaskCompleted}/{subtaskCount}
              </span>
            )}

            {/* Comments */}
            {commentCount > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <MessageSquare className="h-3 w-3" />
                {commentCount}
              </span>
            )}
          </div>

          {/* Subtask progress bar */}
          {subtaskCount > 0 && (
            <div className="h-0.5 w-full bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full transition-all"
                style={{ width: `${subtaskPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Assignee avatar (single) */}
        <div className="shrink-0 pt-0.5">
          {task.assignees && task.assignees.length > 0 ? (
            <Avatar className="h-5 w-5 border border-border/50">
              <AvatarImage src={task.assignees[0].profiles?.avatar_url} />
              <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                {task.assignees[0].profiles?.full_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-5 w-5 rounded-full bg-muted/30 border border-dashed border-muted-foreground/20 flex items-center justify-center">
              <User className="h-2.5 w-2.5 text-muted-foreground/40" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
