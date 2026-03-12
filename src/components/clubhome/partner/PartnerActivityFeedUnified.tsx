import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, UserPlus, Briefcase, Calendar, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityEvent {
  id: string;
  type: 'application' | 'job' | 'meeting' | 'stage_change';
  title: string;
  description: string;
  timestamp: string;
  icon: typeof Activity;
  iconBgColor: string;
  actionUrl?: string;
}

interface PartnerActivityFeedUnifiedProps {
  companyId: string;
}

export function PartnerActivityFeedUnified({ companyId }: PartnerActivityFeedUnifiedProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();

    const channel = supabase
      .channel('partner-activity-unified')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'applications' }, () => fetchActivities())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  const fetchActivities = async () => {
    try {
      const results: ActivityEvent[] = [];
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (jobs && jobs.length > 0) {
        const jobIds = jobs.map(j => j.id);
        const jobNameMap = jobs.reduce((acc, j) => { acc[j.id] = j.title; return acc; }, {} as Record<string, string>);

        const { data: apps } = await supabase
          .from('applications')
          .select('id, applied_at, position, user_id, current_stage_index, stages, updated_at')
          .in('job_id', jobIds)
          .gte('applied_at', cutoff)
          .order('applied_at', { ascending: false })
          .limit(10);

        if (apps) {
          const userIds = apps.map(a => a.user_id).filter(Boolean) as string[];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds.length > 0 ? userIds : ['__none__']);

          const nameMap = profiles?.reduce((acc, p) => {
            acc[p.id] = p.full_name || 'Candidate';
            return acc;
          }, {} as Record<string, string>) || {};

          apps.forEach(app => {
            results.push({
              id: `app-${app.id}`,
              type: 'application',
              title: 'New Application',
              description: `${nameMap[app.user_id || ''] || 'Candidate'} applied for ${app.position}`,
              timestamp: app.applied_at,
              icon: UserPlus,
              iconBgColor: 'bg-blue-500/10 text-blue-500',
              actionUrl: `/applications/${app.id}`,
            });
          });
        }

        jobs.filter(j => j.created_at >= cutoff).forEach(job => {
          results.push({
            id: `job-${job.id}`,
            type: 'job',
            title: 'Role Published',
            description: `${job.title} is now live`,
            timestamp: job.created_at,
            icon: Briefcase,
            iconBgColor: 'bg-emerald-500/10 text-emerald-500',
            actionUrl: `/company-jobs/${job.id}`,
          });
        });
      }

      const { data: meetings } = await supabase
        .from('meetings')
        .select('id, title, created_at')
        .eq('host_id', companyId)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(5);

      meetings?.forEach(m => {
        results.push({
          id: `meet-${m.id}`,
          type: 'meeting',
          title: 'Meeting Scheduled',
          description: m.title,
          timestamp: m.created_at,
          icon: Calendar,
          iconBgColor: 'bg-purple-500/10 text-purple-500',
          actionUrl: `/meetings/${m.id}`,
        });
      });

      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(results.slice(0, 10));
    } catch (error) {
      console.error('Error fetching partner activity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-14" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Recent Activity
          </CardTitle>
          <Badge variant="outline" className="text-xs">Last 7 days</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6">
            <Activity className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium mb-1">No recent activity</p>
            <p className="text-xs text-muted-foreground mb-4">
              Post a role to see applications, interviews, and updates here
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link to="/company-jobs/new">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Post a Role
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map(activity => {
              const IconComp = activity.icon;
              return (
                <Link
                  key={activity.id}
                  to={activity.actionUrl || '#'}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className={`p-1.5 rounded-lg ${activity.iconBgColor}`}>
                    <IconComp className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
