import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Phone,
  Mail,
  Users,
  CheckSquare,
  Clock,
  ArrowRight,
  Linkedin,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Edit,
  Calendar,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { format, isToday, isPast, isTomorrow } from 'date-fns';
import type { CRMActivity, ActivityType } from '@/types/crm-activities';
import { useCRMActivities } from '@/hooks/useCRMActivities';
import { Link } from 'react-router-dom';

const iconMap: Record<ActivityType, React.ReactNode> = {
  call: <Phone className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  meeting: <Users className="w-4 h-4" />,
  task: <CheckSquare className="w-4 h-4" />,
  deadline: <Clock className="w-4 h-4" />,
  follow_up: <ArrowRight className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  note: <FileText className="w-4 h-4" />,
  sms: <MessageSquare className="w-4 h-4" />,
};

const typeColors: Record<ActivityType, string> = {
  call: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  email: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  meeting: 'bg-green-500/20 text-green-500 border-green-500/30',
  task: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  deadline: 'bg-red-500/20 text-red-500 border-red-500/30',
  follow_up: 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30',
  linkedin: 'bg-blue-600/20 text-blue-600 border-blue-600/30',
  note: 'bg-muted text-muted-foreground border-border',
  sms: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
};

interface ActivityItemProps {
  activity: CRMActivity;
  onEdit?: (activity: CRMActivity) => void;
  showProspect?: boolean;
  compact?: boolean;
}

export function ActivityItem({ activity, onEdit, showProspect = true, compact = false }: ActivityItemProps) {
  const [completing, setCompleting] = useState(false);
  const { completeActivity, deleteActivity } = useCRMActivities();

  const handleComplete = async () => {
    setCompleting(true);
    await completeActivity(activity.id);
    setCompleting(false);
  };

  const handleDelete = async () => {
    await deleteActivity(activity.id);
  };

  const dueDate = activity.due_date ? new Date(activity.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !activity.is_done;
  const isDueToday = dueDate && isToday(dueDate);
  const isDueTomorrow = dueDate && isTomorrow(dueDate);

  const getDueDateLabel = () => {
    if (!dueDate) return null;
    if (isToday(dueDate)) return 'Today';
    if (isTomorrow(dueDate)) return 'Tomorrow';
    return format(dueDate, 'MMM d');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        'group relative flex items-start gap-3 p-3 rounded-xl border transition-all',
        activity.is_done 
          ? 'bg-muted/30 border-border/30 opacity-60' 
          : 'bg-gradient-to-br from-card/90 to-card/60 border-border/50 hover:border-border hover:shadow-md',
        isOverdue && !activity.is_done && 'border-red-500/50 bg-red-500/5',
        activity.priority === 2 && !activity.is_done && 'ring-2 ring-red-500/30',
        compact && 'p-2'
      )}
    >
      {/* Checkbox */}
      <div className="pt-0.5">
        <Checkbox
          checked={activity.is_done}
          onCheckedChange={() => !activity.is_done && handleComplete()}
          disabled={activity.is_done || completing}
          className={cn(
            'transition-all',
            activity.is_done && 'data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500'
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          {/* Type Badge */}
          <div className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs',
            typeColors[activity.activity_type]
          )}>
            {iconMap[activity.activity_type]}
            {!compact && <span className="capitalize">{activity.activity_type}</span>}
          </div>

          {/* Priority Badge */}
          {activity.priority > 0 && !activity.is_done && (
            <Badge 
              variant="outline" 
              className={cn(
                'text-xs',
                activity.priority === 2 
                  ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                  : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
              )}
            >
              {activity.priority === 2 ? 'Urgent' : 'High'}
            </Badge>
          )}

          {/* Due Date */}
          {dueDate && (
            <div className={cn(
              'flex items-center gap-1 text-xs',
              isOverdue ? 'text-red-400' : isDueToday ? 'text-yellow-400' : 'text-muted-foreground'
            )}>
              {isOverdue && <AlertTriangle className="w-3 h-3" />}
              <Calendar className="w-3 h-3" />
              <span>{getDueDateLabel()}</span>
              {activity.due_time && (
                <span>{format(new Date(`2000-01-01T${activity.due_time}`), 'h:mm a')}</span>
              )}
            </div>
          )}
        </div>

        {/* Subject */}
        <p className={cn(
          'font-medium text-sm mt-1',
          activity.is_done && 'line-through text-muted-foreground'
        )}>
          {activity.subject}
        </p>

        {/* Prospect Link */}
        {showProspect && activity.prospect_name && (
          <Link 
            to={`/crm/prospects/${activity.prospect_id}`}
            className="text-xs text-muted-foreground hover:text-primary transition-colors mt-1 block"
          >
            {activity.prospect_name}
            {activity.prospect_company && ` • ${activity.prospect_company}`}
          </Link>
        )}

        {/* Outcome (if completed) */}
        {activity.is_done && activity.outcome && (
          <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
            <Check className="w-3 h-3" />
            <span className="capitalize">{activity.outcome.replace('_', ' ')}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!activity.is_done && (
            <DropdownMenuItem onClick={handleComplete}>
              <Check className="w-4 h-4 mr-2" />
              Mark Complete
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onEdit?.(activity)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
