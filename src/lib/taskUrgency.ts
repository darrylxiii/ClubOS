import { isPast, differenceInDays } from "date-fns";

/**
 * Computes an urgency score for a task.
 * Higher score = should appear higher in the column.
 */
export function computeUrgency(task: {
  due_date?: string | null;
  priority: string;
  status: string;
  blockingCount?: number;
  blockedByCount?: number;
}): number {
  let score = 0;

  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && task.status !== "completed";

  // Overdue: massive boost
  if (isOverdue) score += 100;

  // Blocked tasks sink
  if ((task.blockedByCount ?? 0) > 0) score -= 50;

  // Tasks blocking others rise
  score += (task.blockingCount ?? 0) * 10;

  // Priority
  if (task.priority === "high") score += 30;
  else if (task.priority === "medium") score += 15;

  // Due soon bonus
  if (dueDate && !isOverdue) {
    const daysUntil = differenceInDays(dueDate, new Date());
    if (daysUntil <= 2) score += 20;
    else if (daysUntil <= 7) score += 10;
  }

  return score;
}
