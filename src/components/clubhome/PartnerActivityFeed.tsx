import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, UserPlus, Briefcase, Calendar, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityEvent {
  id: string;
  type: 'application' | 'profile_view' | 'meeting' | 'job';
  title: string;
  description: string;
  timestamp: string;
  icon: any;
  iconBgColor: string;
}

interface PartnerActivityFeedProps {
  companyId: string;
}

export const PartnerActivityFeed = ({ companyId }: PartnerActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();

    // Set up realtime subscription
    const channel = supabase
      .channel('partner-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'applications'
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  const fetchActivities = async () => {
    try {
      const activities: ActivityEvent[] = [];
      const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // Last 7 days

      // Get company's job IDs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, created_at')
        .eq('company_id', companyId)
        .gte('created_at', cutoffTime)
        .order('created_at', { ascending: false })
        .limit(5);

      if (jobs && jobs.length > 0) {
        const jobIds = jobs.map(j => j.id);

        // Fetch applications
        const { data: apps } = await supabase
          .from('applications')
          .select('id, applied_at, position, user_id')
          .in('job_id', jobIds)
          .gte('applied_at', cutoffTime)
          .order('applied_at', { ascending: false })
          .limit(10);

        if (apps) {
          // Get candidate names
          const userIds = apps.map(a => a.user_id).filter(Boolean) as string[];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);

          const nameMap = profiles?.reduce((acc, p) => {
            acc[p.id] = p.full_name || 'Candidate';
            return acc;
          }, {} as Record<string, string>) || {};

          apps.forEach(app => {
            activities.push({
              id: app.id,
              type: 'application',
              title: 'New Application',
              description: `${nameMap[app.user_id || ''] || 'Candidate'} applied to ${app.position}`,
              timestamp: app.applied_at,
              icon: UserPlus,
              iconBgColor: 'bg-blue-500/10 text-blue-500'
            });
          });
        }

        // Add job creation events
        jobs.forEach(job => {
          activities.push({
            id: job.id,
            type: 'job',
            title: 'Job Posted',
            description: `${job.title} is now live`,
            timestamp: job.created_at,
            icon: Briefcase,
            iconBgColor: 'bg-green-500/10 text-green-500'
          });
        });
      }

      // Fetch meetings
      const { data: meetings } = await supabase
        .from('meetings')
        .select('id, title, created_at, scheduled_start')
        .eq('host_id', companyId)
        .gte('created_at', cutoffTime)
        .order('created_at', { ascending: false })
        .limit(5);

      if (meetings) {
        meetings.forEach(meeting => {
          activities.push({
            id: meeting.id,
            type: 'meeting',
            title: 'Meeting Scheduled',
            description: meeting.title,
            timestamp: meeting.created_at,
            icon: Calendar,
            iconBgColor: 'bg-purple-500/10 text-purple-500'
          });
        });
      }

      // Sort all activities by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(activities.slice(0, 10));
    } catch (error) {
      console.error('Error fetching partner activities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Feed
          </CardTitle>
          <CardDescription>Recent platform activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Feed
          </CardTitle>
          <CardDescription>Recent platform activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Feed
        </CardTitle>
        <CardDescription>Recent platform activity (last 7 days)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div 
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className={`p-2 rounded-lg ${activity.iconBgColor}`}>
                <activity.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activity.title}</p>
                <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
              </div>
              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
