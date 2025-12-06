import { useState, useEffect, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Activity, UserPlus, ArrowRight, XCircle, MessageSquare, 
  FileText, Calendar, ChevronDown, ChevronUp 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, parseISO } from "date-fns";

interface InlineActivityFeedProps {
  jobId: string;
  initialLimit?: number;
}

const ACTION_ICONS: Record<string, any> = {
  'candidate_added': UserPlus,
  'stage_advanced': ArrowRight,
  'candidate_rejected': XCircle,
  'interview_scheduled': Calendar,
  'note_added': MessageSquare,
  'document_uploaded': FileText,
  'job_viewed': Activity,
};

const ACTION_LABELS: Record<string, string> = {
  'candidate_added': 'added a candidate',
  'stage_advanced': 'advanced a candidate',
  'candidate_rejected': 'rejected a candidate',
  'interview_scheduled': 'scheduled an interview',
  'note_added': 'added a note',
  'document_uploaded': 'uploaded a document',
  'job_viewed': 'viewed the job',
};

export const InlineActivityFeed = memo(({ jobId, initialLimit = 5 }: InlineActivityFeedProps) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Get count first
        const { count } = await supabase
          .from('pipeline_audit_logs')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', jobId);
        
        setTotalCount(count || 0);
        
        // Fetch activities
        const limit = isExpanded ? 20 : initialLimit;
        const { data, error } = await supabase
          .from('pipeline_audit_logs')
          .select(`
            id,
            action,
            created_at,
            stage_data,
            metadata,
            profiles:user_id (
              full_name,
              avatar_url
            )
          `)
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (!error) {
          setActivities(data || []);
        }
      } catch (err) {
        console.error('Error fetching activities:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [jobId, initialLimit, isExpanded]);

  if (loading) {
    return (
      <Card className="border border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted/30" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted/30 rounded" />
                  <div className="h-3 w-1/4 bg-muted/30 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            Recent Activity
          </h4>
          {totalCount > initialLimit && (
            <span className="text-xs text-muted-foreground">
              {totalCount} total
            </span>
          )}
        </div>
        
        {activities.length === 0 ? (
          <div className="text-center py-6">
            <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = ACTION_ICONS[activity.action] || Activity;
              const actionLabel = ACTION_LABELS[activity.action] || activity.action;
              const userName = activity.profiles?.full_name || 'Someone';
              const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
              const timeAgo = formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true });
              
              // Extract candidate name from metadata if available
              const candidateName = activity.stage_data?.candidate_name || activity.metadata?.candidate_name;
              
              return (
                <div 
                  key={activity.id}
                  className="flex items-start gap-3 group"
                >
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={activity.profiles?.avatar_url} />
                    <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{userName}</span>
                      <span className="text-muted-foreground"> {actionLabel}</span>
                      {candidateName && (
                        <span className="font-medium"> {candidateName}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{timeAgo}</p>
                  </div>
                  
                  <div className="p-1.5 rounded-full bg-muted/30 flex-shrink-0">
                    <Icon className="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
            
            {totalCount > initialLimit && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    View {totalCount - initialLimit} More
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

InlineActivityFeed.displayName = 'InlineActivityFeed';
