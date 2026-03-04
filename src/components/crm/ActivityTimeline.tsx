import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, Phone, Video, MessageSquare, CheckSquare, 
  FileText, Target, Clock 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityTimelineProps {
  prospectId?: string;
  companyId?: string;
  limit?: number;
}

interface TouchpointActivity {
  id: string;
  type: string;
  direction: string | null;
  subject: string | null;
  body_preview: string | null;
  sentiment: string | null;
  occurred_at: string;
  created_at: string;
}

const activityIcons: Record<string, typeof Mail> = {
  email: Mail,
  call: Phone,
  meeting: Video,
  message: MessageSquare,
  task: CheckSquare,
  note: FileText,
  other: Target,
};

const activityColors: Record<string, string> = {
  email: "text-blue-500",
  call: "text-green-500",
  meeting: "text-purple-500",
  message: "text-orange-500",
  task: "text-yellow-500",
  note: "text-muted-foreground",
  other: "text-pink-500",
};

export function ActivityTimeline({ 
  prospectId, 
  companyId, 
  limit = 20 
}: ActivityTimelineProps) {
  const [activities, setActivities] = useState<TouchpointActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [prospectId, companyId]);

  const loadActivities = async () => {
    try {
      let query = supabase
        .from('crm_touchpoints')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(limit);

      if (prospectId) {
        query = query.eq('prospect_id', prospectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setActivities((data || []) as TouchpointActivity[]);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No activities yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = activityIcons[activity.type] || activityIcons.other;
        const colorClass = activityColors[activity.type] || activityColors.other;

        return (
          <Card key={activity.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className={`flex-shrink-0 ${colorClass}`}>
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {activity.type}
                      </Badge>
                      {activity.direction && (
                        <Badge variant="outline" className="text-xs">
                          {activity.direction}
                        </Badge>
                      )}
                      {activity.sentiment && (
                        <Badge variant="outline" className="text-xs">
                          {activity.sentiment}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true })}
                    </span>
                  </div>

                  {activity.subject && (
                    <h4 className="font-medium mb-1">{activity.subject}</h4>
                  )}

                  {activity.body_preview && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {activity.body_preview}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
