import { useState, useEffect, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Activity, UserPlus, ArrowRight, XCircle, MessageSquare, 
  FileText, Calendar, ChevronDown, ChevronUp, ArrowUpDown,
  Eye, Mail, Settings
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, parseISO } from "date-fns";

interface InlineActivityFeedProps {
  jobId: string;
  initialLimit?: number;
}

const ACTION_ICONS: Record<string, any> = {
  'candidate_added': UserPlus,
  'candidate_advanced': ArrowRight,
  'candidate_moved_back': ArrowRight,
  'candidate_declined': XCircle,
  'stage_changed_manual': ArrowUpDown,
  'stage_added': Settings,
  'stage_removed': XCircle,
  'stage_updated': Settings,
  'stage_reordered': ArrowUpDown,
  'interview_scheduled': Calendar,
  'note_added': MessageSquare,
  'document_uploaded': FileText,
  'job_viewed': Eye,
  'email_dump_created': Mail,
};

const ACTION_LABELS: Record<string, string> = {
  'candidate_added': 'added a candidate',
  'candidate_advanced': 'advanced a candidate',
  'candidate_moved_back': 'moved back a candidate',
  'candidate_declined': 'declined a candidate',
  'stage_changed_manual': 'changed stage',
  'stage_added': 'added a stage',
  'stage_removed': 'removed a stage',
  'stage_updated': 'updated a stage',
  'stage_reordered': 'reordered stages',
  'interview_scheduled': 'scheduled an interview',
  'note_added': 'added a note',
  'document_uploaded': 'uploaded a document',
  'job_viewed': 'viewed the job',
  'email_dump_created': 'created email dump',
};

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  user_id: string;
  stage_data: any;
  metadata: any;
}

export const InlineActivityFeed = memo(({ jobId, initialLimit = 5 }: InlineActivityFeedProps) => {
  const [activities, setActivities] = useState<(AuditLog & { profile?: { full_name: string | null; avatar_url: string | null } })[]>([]);
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
          .select('id, action, created_at, user_id, stage_data, metadata')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (error) {
          console.error('Error fetching audit logs:', error);
          setActivities([]);
          return;
        }

        if (!data || data.length === 0) {
          setActivities([]);
          return;
        }

        // Fetch profiles separately to avoid join issues
        const userIds = [...new Set(data.map(d => d.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const enriched = data.map(log => ({
          ...log,
          profile: profileMap.get(log.user_id) || null,
        }));

        setActivities(enriched);
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
              const actionLabel = ACTION_LABELS[activity.action] || activity.action.replace(/_/g, ' ');
              const userName = activity.profile?.full_name || 'Someone';
              const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
              const timeAgo = formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true });
              
              // Extract candidate name from stage_data or metadata
              const candidateName = activity.stage_data?.candidate_name || activity.metadata?.candidate_name;
              
              return (
                <div 
                  key={activity.id}
                  className="flex items-start gap-3 group"
                >
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={activity.profile?.avatar_url || undefined} />
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
