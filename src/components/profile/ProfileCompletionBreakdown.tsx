import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileTask } from "@/lib/profileStrengthTasks";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileCompletionBreakdownProps {
  tasks: ProfileTask[];
  completedTasks: Set<string>;
  maxToShow?: number;
  onTaskClick?: (task: ProfileTask) => void;
}

export const ProfileCompletionBreakdown = ({
  tasks,
  completedTasks,
  maxToShow = 5,
  onTaskClick
}: ProfileCompletionBreakdownProps) => {
  // Separate completed and incomplete tasks
  const incompleteTasks = tasks.filter(t => !completedTasks.has(t.key));
  const completed = tasks.filter(t => completedTasks.has(t.key));
  
  // Show incomplete first, then completed, limited to maxToShow
  const displayTasks = [...incompleteTasks.slice(0, maxToShow)];
  const remainingSlots = maxToShow - displayTasks.length;
  if (remainingSlots > 0) {
    displayTasks.push(...completed.slice(0, remainingSlots));
  }

  const totalIncomplete = incompleteTasks.length;

  return (
    <div className="space-y-3">
      {/* Summary header */}
      {totalIncomplete > 0 && (
        <div className="flex items-center gap-2 px-1">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-muted-foreground">
            {totalIncomplete} {totalIncomplete === 1 ? 'item' : 'items'} to complete
          </span>
        </div>
      )}

      {/* Task list with breakdown */}
      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {displayTasks.map((task, index) => {
            const isCompleted = completedTasks.has(task.key);
            const Icon = task.icon;
            
            return (
              <motion.button
                key={task.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                onClick={() => onTaskClick?.(task)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all group text-left",
                  isCompleted 
                    ? "bg-primary/5 border border-primary/10" 
                    : "glass-subtle hover:bg-card/80 border border-transparent hover:border-primary/20"
                )}
              >
                {/* Status icon */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                  isCompleted ? "bg-primary/20" : "bg-muted group-hover:bg-primary/10"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : (
                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </div>

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-sm block truncate",
                    isCompleted 
                      ? "line-through text-muted-foreground" 
                      : "font-medium text-foreground"
                  )}>
                    {task.title}
                  </span>
                  {!isCompleted && (
                    <span className="text-xs text-muted-foreground block truncate">
                      {task.description}
                    </span>
                  )}
                </div>

                {/* Level badge */}
                <div className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0",
                  isCompleted 
                    ? "bg-primary/10 text-primary" 
                    : "bg-muted text-muted-foreground"
                )}>
                  L{task.level}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Show more indicator */}
      {incompleteTasks.length > maxToShow && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          +{incompleteTasks.length - maxToShow} more items to complete
        </p>
      )}
    </div>
  );
};
