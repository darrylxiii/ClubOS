import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar, 
  Clock, 
  User, 
  Briefcase, 
  AlertTriangle,
  Timer,
  Repeat,
  Tag
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { useUnifiedTasks, UnifiedTask } from "@/contexts/UnifiedTasksContext";

interface EnhancedTaskCardProps {
  task: UnifiedTask;
  onClick: (task: UnifiedTask) => void;
  showSelection?: boolean;
}

export function EnhancedTaskCard({ 
  task, 
  onClick,
  showSelection = true 
}: EnhancedTaskCardProps) {
  const { selectedTaskIds, toggleTaskSelection } = useUnifiedTasks();
  const isSelected = selectedTaskIds.has(task.id);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: task,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { color: 'bg-red-500/10 text-red-600 border-red-200/30', icon: '🔥' };
      case 'high':
        return { color: 'bg-orange-500/10 text-orange-600 border-orange-200/30', icon: '⬆️' };
      case 'medium':
        return { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200/30', icon: null };
      default:
        return { color: 'bg-blue-500/10 text-blue-600 border-blue-200/30', icon: '⬇️' };
    }
  };

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed';
  const isDueToday = task.due_date && isToday(new Date(task.due_date));
  const hasTimeTracked = (task.time_tracked_minutes || 0) > 0;
  const isRecurring = task.recurrence_rule !== null && task.recurrence_rule !== undefined;

  const priorityConfig = getPriorityConfig(task.priority);

  const formatTimeTracked = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTaskSelection(task.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "group relative transition-all duration-200 touch-none",
        isDragging ? "z-50 opacity-60 scale-105 rotate-1" : "z-0 hover:-translate-y-0.5",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={() => onClick(task)}
    >
      <Card className={cn(
        "p-3.5 cursor-pointer border-border/40 bg-card/80 backdrop-blur-sm",
        "shadow-sm hover:shadow-md transition-all duration-200",
        "hover:border-primary/30",
        isDragging && "ring-2 ring-primary",
        isOverdue && "border-l-2 border-l-red-500"
      )}>
        {/* Selection checkbox */}
        {showSelection && (
          <div 
            className={cn(
              "absolute -left-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity",
              isSelected && "opacity-100"
            )}
            onClick={handleCheckboxClick}
          >
            <div className="bg-background border rounded-md p-0.5 shadow-sm">
              <Checkbox checked={isSelected} />
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-2.5 gap-2">
          <div className="flex items-center gap-1.5">
            <Badge 
              variant="outline" 
              className={cn("text-[10px] px-1.5 py-0 h-5 font-medium", priorityConfig.color)}
            >
              {priorityConfig.icon && <span className="mr-0.5">{priorityConfig.icon}</span>}
              {task.priority}
            </Badge>

            {isOverdue && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-red-500/10 text-red-600 border-red-200/30 gap-0.5">
                <AlertTriangle className="h-3 w-3" />
                Overdue
              </Badge>
            )}

            {isRecurring && (
              <Repeat className="h-3 w-3 text-muted-foreground" />
            )}
          </div>

          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
            {task.task_number}
          </span>
        </div>

        {/* Title */}
        <h3 className={cn(
          "font-medium text-sm text-foreground mb-2 line-clamp-2 leading-snug",
          "group-hover:text-primary transition-colors"
        )}>
          {task.title}
        </h3>

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            {task.labels.slice(0, 3).map(label => (
              <Badge
                key={label.id}
                variant="secondary"
                className="text-[9px] px-1.5 py-0 h-4"
                style={{ backgroundColor: `${label.color}20`, color: label.color }}
              >
                {label.name}
              </Badge>
            ))}
            {task.labels.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{task.labels.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/30">
          {/* Assignees */}
          <div className="flex -space-x-2">
            {task.assignees && task.assignees.length > 0 ? (
              task.assignees.slice(0, 3).map((a, i) => (
                <Avatar key={i} className="h-6 w-6 border-2 border-background ring-1 ring-border/30">
                  <AvatarImage src={a.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-[9px] bg-primary/5 text-primary font-medium">
                    {a.profiles?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
              ))
            ) : (
              <div className="h-6 w-6 rounded-full bg-muted/50 border border-dashed border-muted-foreground/30 flex items-center justify-center">
                <User className="h-3 w-3 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-2.5 text-muted-foreground">
            {hasTimeTracked && (
              <div className="flex items-center gap-1 text-[10px]" title="Time tracked">
                <Timer className="h-3 w-3" />
                {formatTimeTracked(task.time_tracked_minutes || 0)}
              </div>
            )}

            {task.timer_running && (
              <div className="flex items-center gap-1 text-[10px] text-green-600 animate-pulse">
                <Clock className="h-3 w-3" />
                Running
              </div>
            )}

            {task.due_date && (
              <div 
                className={cn(
                  "flex items-center gap-1 text-[10px]",
                  isOverdue && "text-red-600",
                  isDueToday && !isOverdue && "text-orange-600"
                )}
                title={`Due ${format(new Date(task.due_date), 'MMM d, yyyy')}`}
              >
                <Calendar className="h-3 w-3" />
                {format(new Date(task.due_date), 'MMM d')}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
