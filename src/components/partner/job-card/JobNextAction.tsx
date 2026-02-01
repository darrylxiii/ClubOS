import { memo, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  TrendingUp, 
  AlertTriangle, 
  Trophy,
  Clock,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobNextActionProps {
  candidateCount: number;
  activeStageCount: number;
  daysOpen: number;
  conversionRate: number | null;
  lastActivityDays: number | null;
}

interface ActionSuggestion {
  icon: React.ElementType;
  message: string;
  variant: 'default' | 'warning' | 'success' | 'info';
}

const getNextAction = ({
  candidateCount,
  activeStageCount,
  daysOpen,
  conversionRate,
  lastActivityDays,
}: JobNextActionProps): ActionSuggestion | null => {
  // Priority 1: Candidates awaiting feedback
  if (activeStageCount > 0 && activeStageCount >= candidateCount * 0.5) {
    return {
      icon: MessageSquare,
      message: `${activeStageCount} candidate${activeStageCount > 1 ? 's' : ''} awaiting feedback`,
      variant: 'warning',
    };
  }

  // Priority 2: Role needs promotion (long open, few candidates)
  if (daysOpen > 45 && candidateCount < 5) {
    return {
      icon: TrendingUp,
      message: 'Consider promoting — low applicants',
      variant: 'warning',
    };
  }

  // Priority 3: Pipeline stalled (no activity in 7+ days)
  if (lastActivityDays !== null && lastActivityDays > 7 && activeStageCount > 0) {
    return {
      icon: Clock,
      message: 'Pipeline stalled — check in',
      variant: 'warning',
    };
  }

  // Priority 4: High performing role
  if (conversionRate !== null && conversionRate >= 20) {
    return {
      icon: Trophy,
      message: 'High performing role',
      variant: 'success',
    };
  }

  // Priority 5: Good candidate volume
  if (candidateCount >= 10 && activeStageCount > 0) {
    return {
      icon: Users,
      message: 'Strong pipeline — review candidates',
      variant: 'info',
    };
  }

  // No action needed
  return null;
};

const variantStyles = {
  default: 'bg-card/30 text-muted-foreground border-border/20',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  success: 'bg-primary/10 text-primary border-primary/30',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
};

export const JobNextAction = memo((props: JobNextActionProps) => {
  const action = useMemo(() => getNextAction(props), [props]);

  if (!action) return null;

  const Icon = action.icon;

  return (
    <div 
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border',
        variantStyles[action.variant]
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{action.message}</span>
    </div>
  );
});

JobNextAction.displayName = 'JobNextAction';
