import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Calendar, CheckCircle, Clock, Flag, Target, TrendingUp, Users } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { Link } from "react-router-dom";

interface ObjectiveCardProps {
  objective: {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority?: string;
    owners?: string[];
    start_date?: string;
    due_date?: string;
    hard_deadline?: string;
    completion_percentage?: number;
    tags?: any[];
    milestone_type?: string;
    tasks?: Array<{
      id: string;
      title: string;
      status: string;
      priority?: string;
      due_date?: string;
    }>;
  };
  ownerProfiles?: Array<{
    id: string;
    full_name: string;
    avatar_url?: string;
  }>;
}

export const ObjectiveCard = ({ objective, ownerProfiles }: ObjectiveCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'in_progress': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      case 'delayed': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
      case 'medium': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      case 'low': return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getUrgencyBadge = () => {
    if (!objective.due_date) return null;
    
    const daysUntilDue = differenceInDays(new Date(objective.due_date), new Date());
    const isOverdue = isPast(new Date(objective.due_date));
    
    if (isOverdue) {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 gap-1">
          <AlertCircle className="h-3 w-3" />
          Overdue
        </Badge>
      );
    }
    
    if (daysUntilDue <= 3) {
      return (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20 gap-1">
          <Clock className="h-3 w-3" />
          Due Soon
        </Badge>
      );
    }
    
    if (objective.completion_percentage && objective.completion_percentage > 80) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 gap-1">
          <TrendingUp className="h-3 w-3" />
          On Track
        </Badge>
      );
    }
    
    return null;
  };

  const urgentTasks = objective.tasks
    ?.filter(t => t.status !== 'completed')
    .sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      return 0;
    })
    .slice(0, 3);

  return (
    <Link to={`/objectives/${objective.id}`}>
      <Card className="hover:shadow-lg transition-all duration-200 hover:border-primary/50 cursor-pointer group">
        <CardContent className="p-6 space-y-4">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                {objective.title}
              </h3>
              {objective.milestone_type && (
                <Badge variant="outline" className="shrink-0">
                  <Target className="h-3 w-3 mr-1" />
                  {objective.milestone_type}
                </Badge>
              )}
            </div>
            
            {/* Status and Priority Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={getStatusColor(objective.status)}>
                {objective.status.replace('_', ' ')}
              </Badge>
              {objective.priority && (
                <Badge variant="outline" className={getPriorityColor(objective.priority)}>
                  <Flag className="h-3 w-3 mr-1" />
                  {objective.priority}
                </Badge>
              )}
              {getUrgencyBadge()}
            </div>

            {/* Tags */}
            {objective.tags && objective.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {objective.tags.map((tag: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{objective.completion_percentage || 0}%</span>
            </div>
            <Progress value={objective.completion_percentage || 0} className="h-2" />
          </div>

          {/* Owners */}
          {ownerProfiles && ownerProfiles.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="flex -space-x-2">
                {ownerProfiles.slice(0, 3).map((owner) => (
                  <Avatar key={owner.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={owner.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {owner.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {ownerProfiles.length > 3 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                    +{ownerProfiles.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          {(objective.due_date || objective.hard_deadline) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Due: {format(new Date(objective.due_date || objective.hard_deadline!), 'MMM dd, yyyy')}
              </span>
            </div>
          )}

          {/* Urgent Tasks Preview */}
          {urgentTasks && urgentTasks.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground">Next Tasks</div>
              {urgentTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{task.title}</span>
                </div>
              ))}
              {objective.tasks && objective.tasks.length > 3 && (
                <div className="text-xs text-primary">
                  +{objective.tasks.length - 3} more tasks
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};
