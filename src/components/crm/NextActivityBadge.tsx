import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

interface NextActivityBadgeProps {
  nextActivityAt: string | null;
  className?: string;
}

export function NextActivityBadge({ nextActivityAt, className }: NextActivityBadgeProps) {
  const { t } = useTranslation('common');
  if (!nextActivityAt) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge 
            variant="outline" 
            className={cn(
              'text-xs bg-orange-500/10 text-orange-400 border-orange-500/30',
              className
            )}
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            No activity
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("no_activity_scheduled_for", "No activity scheduled for this prospect")}</p>
          <p className="text-xs text-muted-foreground">{t("schedule_an_activity_to", "Schedule an activity to stay on track")}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const date = parseISO(nextActivityAt);
  const isDueToday = isToday(date);
  const isDueTomorrow = isTomorrow(date);
  const isOverdue = isPast(date) && !isDueToday;

  const getLabel = () => {
    if (isDueToday) return 'Today';
    if (isDueTomorrow) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const getColor = () => {
    if (isOverdue) return 'bg-red-500/10 text-red-400 border-red-500/30';
    if (isDueToday) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    return 'bg-green-500/10 text-green-400 border-green-500/30';
  };

  const getIcon = () => {
    if (isOverdue) return <AlertCircle className="w-3 h-3 mr-1" />;
    if (isDueToday) return <Calendar className="w-3 h-3 mr-1" />;
    return <CheckCircle2 className="w-3 h-3 mr-1" />;
  };

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge 
          variant="outline" 
          className={cn(
            'text-xs',
            getColor(),
            isOverdue && 'animate-pulse',
            className
          )}
        >
          {getIcon()}
          {getLabel()}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>Next activity: {format(date, 'PPP p')}</p>
        {isOverdue && <p className="text-xs text-red-400">{t("this_activity_is_overdue", "This activity is overdue!")}</p>}
      </TooltipContent>
    </Tooltip>
  );
}
