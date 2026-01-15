import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Heart, 
  Share2, 
  UserPlus, 
  Briefcase,
  Award,
  MoreHorizontal
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityTimelineProps {
  userId: string;
  viewMode?: 'list' | 'grid';
}

export function ActivityTimeline({ userId, viewMode = 'grid' }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [userId]);

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from('activity_feed')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setActivities(data);
    }
    setLoading(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'post': return <MessageSquare className="w-4 h-4" />;
      case 'like': return <Heart className="w-4 h-4" />;
      case 'share': return <Share2 className="w-4 h-4" />;
      case 'follow': return <UserPlus className="w-4 h-4" />;
      case 'job_applied': return <Briefcase className="w-4 h-4" />;
      case 'achievement': return <Award className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'post': return 'text-primary';
      case 'like': return 'text-red-500';
      case 'share': return 'text-blue-500';
      case 'follow': return 'text-green-500';
      case 'achievement': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'grid') {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Activity</span>
            <Badge variant="secondary">{activities.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="glass-subtle rounded-xl p-4 hover:glass transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-background/50 ${getActivityColor(activity.event_type)}`}>
                    {getActivityIcon(activity.event_type)}
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm font-medium line-clamp-2 mb-2">
                  {activity.event_data?.title || activity.event_type}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex gap-4 items-start">
              <div className="relative">
                <div className={`p-2 rounded-full bg-background/50 ${getActivityColor(activity.event_type)}`}>
                  {getActivityIcon(activity.event_type)}
                </div>
                {index < activities.length - 1 && (
                  <div className="absolute left-1/2 top-10 h-8 w-px bg-border -translate-x-1/2" />
                )}
              </div>
              <div className="flex-1 glass-subtle rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">
                      {activity.event_data?.title || activity.event_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
