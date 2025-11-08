import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Eye, 
  TrendingUp, 
  UserPlus,
  CheckCircle,
  Activity as ActivityIcon
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";

interface TimelineActivity {
  id: string;
  activity_type: string;
  activity_data: any;
  created_at: string;
}

export function ActivityTimeline({ userId }: { userId: string }) {
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchActivities();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('activity-timeline')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_timeline',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setActivities(prev => [payload.new as TimelineActivity, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_timeline')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityConfig = (type: string) => {
    const configs: Record<string, { icon: any; label: string; color: string }> = {
      application_submitted: {
        icon: FileText,
        label: 'Application submitted',
        color: 'text-primary'
      },
      application_stage_changed: {
        icon: TrendingUp,
        label: 'Pipeline stage updated',
        color: 'text-success'
      },
      profile_viewed: {
        icon: Eye,
        label: 'Profile viewed',
        color: 'text-primary'
      },
      match_created: {
        icon: TrendingUp,
        label: 'New job match',
        color: 'text-success'
      },
      profile_updated: {
        icon: UserPlus,
        label: 'Profile updated',
        color: 'text-primary'
      },
      task_completed: {
        icon: CheckCircle,
        label: 'Task completed',
        color: 'text-success'
      }
    };
    return configs[type] || { icon: ActivityIcon, label: type, color: 'text-muted-foreground' };
  };

  const formatTimeLabel = (date: string) => {
    const activityDate = new Date(date);
    if (isToday(activityDate)) return 'Today';
    if (isYesterday(activityDate)) return 'Yesterday';
    return format(activityDate, 'MMM d, yyyy');
  };

  const groupActivitiesByDate = (activities: TimelineActivity[]) => {
    const grouped: Record<string, TimelineActivity[]> = {};
    
    activities.forEach(activity => {
      const dateKey = formatTimeLabel(activity.created_at);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(activity);
    });
    
    return grouped;
  };

  if (loading) {
    return (
      <Card className="border-2 border-foreground">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="border-2 border-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground"></div>
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <ActivityIcon className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              No recent activity. Start by browsing jobs or completing your profile.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <Card className="border-2 border-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
          <div className="w-1 h-6 bg-foreground"></div>
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedActivities).map(([date, dateActivities]) => (
          <div key={date} className="space-y-3">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
              {date}
            </h4>
            <div className="space-y-3 pl-4 border-l-2 border-border/30">
              {dateActivities.map((activity) => {
                const config = getActivityConfig(activity.activity_type);
                const Icon = config.icon;
                
                return (
                  <div
                    key={activity.id}
                    className="relative -ml-[9px] pl-6 group"
                  >
                    <div className={`absolute left-0 top-1 w-4 h-4 rounded-full bg-background border-2 border-border flex items-center justify-center ${config.color}`}>
                      <Icon className="w-2 h-2" />
                    </div>
                    
                    <div className="bg-background/30 border border-border/30 rounded-lg p-3 hover:bg-background/40 transition-all">
                      <p className="text-sm font-medium mb-1">
                        {config.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
