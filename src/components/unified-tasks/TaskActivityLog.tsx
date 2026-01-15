import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2, 
  Clock, 
  Edit2, 
  MessageSquare, 
  Paperclip, 
  Tag, 
  User, 
  ArrowRight,
  Loader2
} from "lucide-react";

interface ActivityLogEntry {
  id: string;
  task_id: string;
  user_id: string;
  action_type: string;
  old_value: any;
  new_value: any;
  description: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface TaskActivityLogProps {
  taskId: string;
}

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case 'status_change': return CheckCircle2;
    case 'time_tracked': return Clock;
    case 'comment_added': return MessageSquare;
    case 'attachment_added': return Paperclip;
    case 'label_added': return Tag;
    case 'assignee_changed': return User;
    default: return Edit2;
  }
};

const getActionColor = (actionType: string) => {
  switch (actionType) {
    case 'status_change': return 'text-green-500 bg-green-500/10';
    case 'time_tracked': return 'text-blue-500 bg-blue-500/10';
    case 'comment_added': return 'text-purple-500 bg-purple-500/10';
    case 'attachment_added': return 'text-orange-500 bg-orange-500/10';
    case 'label_added': return 'text-pink-500 bg-pink-500/10';
    case 'assignee_changed': return 'text-indigo-500 bg-indigo-500/10';
    default: return 'text-muted-foreground bg-muted';
  }
};

export const TaskActivityLog = ({ taskId }: TaskActivityLogProps) => {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [taskId]);

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("task_activity_log")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Load user profiles
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(a => a.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        const activitiesWithProfiles = data.map(activity => ({
          ...activity,
          profile: profiles?.find(p => p.id === activity.user_id)
        }));

        setActivities(activitiesWithProfiles);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error("Error loading activity log:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-4 pr-4">
        {activities.map((activity) => {
          const Icon = getActionIcon(activity.action_type);
          const colorClass = getActionColor(activity.action_type);

          return (
            <div key={activity.id} className="flex gap-3">
              <div className={`p-2 rounded-full h-fit ${colorClass}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={activity.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {activity.profile?.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">
                    {activity.profile?.full_name || "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {activity.description || `Updated ${activity.action_type.replace('_', ' ')}`}
                </p>

                {activity.old_value && activity.new_value && (
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <Badge variant="outline" className="text-muted-foreground">
                      {String(activity.old_value)}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline">
                      {String(activity.new_value)}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
