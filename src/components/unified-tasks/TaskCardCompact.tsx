import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  MessageSquare,
  CheckSquare,
  Lock,
  Link2,
  CircleCheck,
  Briefcase,
  Building2,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskCardCompactProps {
  task: any;
  onClick: (task: any) => void;
  isFocused?: boolean;
  taskIndex?: number;
}

const PRIORITY_ACCENT: Record<string, string> = {
  high: "border-l-destructive",
  medium: "border-l-amber-500",
  low: "border-l-emerald-500/40",
};

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
        "group relative touch-none",
        isDragging && "z-50 opacity-40",
        isFocused && "ring-2 ring-primary ring-offset-1 ring-offset-background rounded-lg"
      )}
      onClick={() => onClick(task)}
    >
      <div
        className={cn(
          "flex items-start gap-2 p-2 rounded-lg cursor-pointer border border-l-2 bg-card",
          "transition-[border-color,box-shadow] duration-150 ease-out",
          "hover:border-primary/25 hover:shadow-[0_1px_3px_0_rgba(0,0,0,0.06)]",
          isOverdue
            ? cn("border-l-destructive shadow-[inset_0_0_0_1px_rgba(239,68,68,0.12)]", "border-t-border/20 border-r-border/20 border-b-border/20")
            : cn(PRIORITY_ACCENT[task.priority] || PRIORITY_ACCENT.low, "border-t-border/12 border-r-border/12 border-b-border/12")
        )}
      >
        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Title */}
          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-[13px] font-medium text-foreground truncate leading-snug group-hover:text-primary transition-colors">
                  {task.title}
                </p>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[240px]">
                <p>{task.title}</p>
                <p className="text-muted-foreground font-mono mt-0.5">{task.task_number}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Meta line */}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {/* Priority dot */}
            <div
              className={cn("h-1.5 w-1.5 rounded-full shrink-0", PRIORITY_DOT[task.priority] || PRIORITY_DOT.low)}
            />

            {/* Job/Company context */}
            {task.job && (
              <span className="inline-flex items-center gap-0.5 text-primary/70 font-medium truncate max-w-[80px]" title={task.job.title}>
                <Briefcase className="h-2.5 w-2.5 shrink-0" />
                {task.job.title}
              </span>
            )}
            {task.company && !task.job && (
              <span className="inline-flex items-center gap-0.5 text-muted-foreground font-medium truncate max-w-[80px]" title={task.company.name}>
                <Building2 className="h-2.5 w-2.5 shrink-0" />
                {task.company.name}
              </span>
            )}

            {/* Dependency indicators */}
            {blockedByCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-destructive font-medium" title={`Blocked by ${blockedByCount}`}>
                <Lock className="h-2.5 w-2.5" />
                {blockedByCount}
              </span>
            )}
            {blockingCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-amber-500 font-medium" title={`Blocking ${blockingCount}`}>
                <Link2 className="h-2.5 w-2.5" />
                {blockingCount}
              </span>
            )}
            {isReady && task.status !== "completed" && (
              <CircleCheck className="h-2.5 w-2.5 text-emerald-500" />
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
                <Calendar className="h-2.5 w-2.5" />
                {isOverdue ? "Overdue" : isDueToday ? "Today" : isDueTomorrow ? "Tmr" : format(dueDate, "MMM d")}
              </span>
            )}

            {/* Subtask count */}
            {subtaskCount > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <CheckSquare className="h-2.5 w-2.5" />
                {subtaskCompleted}/{subtaskCount}
              </span>
            )}

            {/* Comments */}
            {commentCount > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <MessageSquare className="h-2.5 w-2.5" />
                {commentCount}
              </span>
            )}
          </div>

          {/* Subtask progress bar */}
          {subtaskCount > 0 && (
            <div className="h-px w-full bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/50 rounded-full transition-all"
                style={{ width: `${subtaskPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Assignee */}
        <div className="shrink-0 pt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
          {task.assignees && task.assignees.length > 0 ? (
            <Avatar className="h-5 w-5 border border-border/40">
              <AvatarImage src={task.assignees[0].profiles?.avatar_url} />
              <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                {task.assignees[0].profiles?.full_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </div>
      </div>
    </div>
  );
};
