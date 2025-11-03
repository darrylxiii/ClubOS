import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CRMActivity } from "@/types/crm";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, Phone, Video, MessageSquare, CheckSquare, 
  FileText, Target, Clock 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityTimelineProps {
  contactId?: string;
  dealId?: string;
  companyId?: string;
  limit?: number;
}

const activityIcons = {
  email: Mail,
  call: Phone,
  meeting: Video,
  message: MessageSquare,
  task: CheckSquare,
  note: FileText,
  assessment: Target
};

const activityColors = {
  email: "text-blue-500",
  call: "text-green-500",
  meeting: "text-purple-500",
  message: "text-orange-500",
  task: "text-yellow-500",
  note: "text-gray-500",
  assessment: "text-pink-500"
};

export function ActivityTimeline({ 
  contactId, 
  dealId, 
  companyId, 
  limit = 20 
}: ActivityTimelineProps) {
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [contactId, dealId, companyId]);

  const loadActivities = async () => {
    try {
      let query = supabase
        .from('crm_activities' as any)
        .select(`
          *,
          creator:created_by(full_name, avatar_url),
          contact:crm_contacts(profile_id, profiles(full_name)),
          deal:crm_deals(title)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (contactId) {
        query = query.eq('contact_id', contactId);
      }
      if (dealId) {
        query = query.eq('deal_id', dealId);
      }
      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedActivities = data.map((activity: any) => ({
        ...activity,
        creator_name: activity.creator?.full_name,
        creator_avatar: activity.creator?.avatar_url,
        contact_name: activity.contact?.profiles?.full_name,
        deal_title: activity.deal?.title
      }));

      setActivities(formattedActivities);
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
        const Icon = activityIcons[activity.activity_type];
        const colorClass = activityColors[activity.activity_type];

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
                        {activity.activity_type}
                      </Badge>
                      {activity.direction && (
                        <Badge variant="outline" className="text-xs">
                          {activity.direction}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {activity.subject && (
                    <h4 className="font-medium mb-1">{activity.subject}</h4>
                  )}

                  {activity.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {activity.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {activity.creator_name && (
                      <div className="flex items-center gap-1">
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={activity.creator_avatar || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {activity.creator_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{activity.creator_name}</span>
                      </div>
                    )}

                    {activity.duration_minutes && (
                      <span>• {activity.duration_minutes} min</span>
                    )}

                    {activity.outcome && (
                      <span>• {activity.outcome}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
