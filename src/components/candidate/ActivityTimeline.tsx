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

  const getActivityConfig = (type: string, data?: any) => {
    const configs: Record<string, { icon: any; label: string; color: string; getDescription?: (d: any) => string }> = {
      application_submitted: {
        icon: FileText,
        label: 'Application submitted',
        color: 'text-primary',
        getDescription: (d) => d?.job_title ? `Applied to ${d.job_title}` : 'Submitted a new application'
      },
      application_status_changed: {
        icon: TrendingUp,
        label: 'Application updated',
        color: 'text-success',
        getDescription: (d) => d?.status ? `Status changed to ${d.status}` : 'Application status updated'
      },
      application_stage_changed: {
        icon: TrendingUp,
        label: 'Pipeline stage updated',
        color: 'text-success'
      },
      profile_viewed: {
        icon: Eye,
        label: 'Profile viewed',
        color: 'text-primary',
        getDescription: (d) => d?.viewer_company ? `Viewed by ${d.viewer_company}` : 'Your profile was viewed'
      },
      match_created: {
        icon: TrendingUp,
        label: 'New job match',
        color: 'text-success',
        getDescription: (d) => d?.match_score ? `${d.match_score}% match found` : 'A new opportunity matches your profile'
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
      },
      assessment_completed: {
        icon: CheckCircle,
        label: 'Assessment completed',
        color: 'text-success',
        getDescription: (d) => d?.assessment_name || 'Completed an assessment'
      },
      interview_scheduled: {
        icon: UserPlus,
        label: 'Interview scheduled',
        color: 'text-primary',
        getDescription: (d) => d?.scheduled_at ? `Interview at ${new Date(d.scheduled_at).toLocaleDateString()}` : 'Interview booked'
      },
      interview_completed: {
        icon: CheckCircle,
        label: 'Interview completed',
        color: 'text-success'
      },
      referral_sent: {
        icon: UserPlus,
        label: 'Referral sent',
        color: 'text-primary'
      },
      referral_hired: {
        icon: CheckCircle,
        label: 'Referral hired',
        color: 'text-success',
        getDescription: () => 'Your referral was hired! Reward unlocked.'
      },
      comment_added: {
        icon: FileText,
        label: 'Comment added',
        color: 'text-muted-foreground'
      },
      payment_released: {
        icon: CheckCircle,
        label: 'Payment released',
        color: 'text-success',
        getDescription: (d) => d?.amount ? `€${d.amount} released` : 'Payment released for milestone'
      },
      offer_received: {
        icon: TrendingUp,
        label: 'Offer received',
        color: 'text-success',
        getDescription: (d) => d?.company_name ? `Offer from ${d.company_name}` : 'You received a job offer!'
      }
    };
    const config = configs[type] || { icon: ActivityIcon, label: type.replace(/_/g, ' '), color: 'text-muted-foreground' };
    return {
      ...config,
      description: config.getDescription?.(data) || null
    };
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
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
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
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
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
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
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
                const config = getActivityConfig(activity.activity_type, activity.activity_data);
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
                      {config.description && (
                        <p className="text-xs text-foreground/80 mb-1">
                          {config.description}
                        </p>
                      )}
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
