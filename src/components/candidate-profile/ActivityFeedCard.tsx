import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Eye, FileText, Send, Calendar, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { candidateProfileTokens } from "@/config/candidate-profile-tokens";
import { formatDistanceToNow } from "date-fns";

interface Props {
  candidateId: string;
}

export const ActivityFeedCard = ({ candidateId }: Props) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadActivity();
  }, [candidateId]);
  
  const loadActivity = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('activity_timeline')
        .select('id, activity_type, description, created_at, metadata')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setActivities(data);
      }
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'profile_view': return Eye;
      case 'application': return FileText;
      case 'message': return Send;
      case 'interview': return Calendar;
      case 'stage_change': return UserCheck;
      default: return Activity;
    }
  };
  
  const getActivityColor = (type: string) => {
    switch (type) {
      case 'profile_view': return 'text-blue-500';
      case 'application': return 'text-green-500';
      case 'message': return 'text-purple-500';
      case 'interview': return 'text-amber-500';
      case 'stage_change': return 'text-cyan-500';
      default: return 'text-muted-foreground';
    }
  };
  
  return (
    <Card className={`${candidateProfileTokens.glass.card} sticky top-[68rem]`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="w-5 h-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet</p>
          ) : (
            activities.map(activity => {
              const Icon = getActivityIcon(activity.activity_type);
              const color = getActivityColor(activity.activity_type);
              
              return (
                <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-lg bg-muted ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};
