import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { 
  Zap, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Send, 
  Clock,
  User,
  Briefcase
} from "lucide-react";

interface ApplicationLog {
  id: string;
  action: string;
  actor_id: string | null;
  details: Record<string, any>;
  created_at: string | null;
  actor?: {
    full_name: string;
  };
}

interface ApplicationLogViewerProps {
  candidateId: string;
  limit?: number;
}

const actionConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  club_sync_auto_apply: { 
    icon: <Zap className="h-4 w-4" />, 
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    label: "Club Sync Auto-Apply" 
  },
  approved: { 
    icon: <CheckCircle className="h-4 w-4" />, 
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    label: "Application Approved" 
  },
  rejected: { 
    icon: <XCircle className="h-4 w-4" />, 
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    label: "Application Rejected" 
  },
  resume_parsed: { 
    icon: <FileText className="h-4 w-4" />, 
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    label: "Resume Parsed" 
  },
  application_submitted: { 
    icon: <Send className="h-4 w-4" />, 
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    label: "Application Submitted" 
  },
  status_changed: { 
    icon: <Clock className="h-4 w-4" />, 
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    label: "Status Changed" 
  },
};

export function ApplicationLogViewer({ candidateId, limit = 20 }: ApplicationLogViewerProps) {
  const [logs, setLogs] = useState<ApplicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, [candidateId]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("candidate_application_logs")
        .select(`
          id,
          action,
          actor_id,
          details,
          created_at
        `)
        .eq("candidate_profile_id", candidateId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      // Fetch actor names
      const actorIds = [...new Set((data || []).map(log => log.actor_id).filter(Boolean))];
      let actorMap = new Map<string, string>();

      if (actorIds.length > 0) {
        const { data: actors } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", actorIds as string[]);

        actorMap = new Map((actors ?? []).map(a => [a.id, a.full_name ?? 'Unknown']));
      }

      const logsWithActors = (data || []).map(log => ({
        ...log,
        details: log.details as Record<string, any>,
        actor: log.actor_id ? { full_name: actorMap.get(log.actor_id) || "System" } : undefined,
      }));

      setLogs(logsWithActors);
    } catch (err: any) {
      console.error("Error loading application logs:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getActionDisplay = (action: string) => {
    return actionConfig[action] || {
      icon: <Clock className="h-4 w-4" />,
      color: "bg-muted text-muted-foreground",
      label: action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Application Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load activity log
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Application Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity recorded yet
          </p>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="relative space-y-4">
              {/* Timeline line */}
              <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

              {logs.map((log) => {
                const display = getActionDisplay(log.action);
                return (
                  <div key={log.id} className="relative flex items-start gap-4 pl-2">
                    {/* Timeline dot */}
                    <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border ${display.color}`}>
                      {display.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{display.label}</span>
                        {log.details?.job_title && (
                          <Badge variant="outline" className="text-xs">
                            <Briefcase className="h-3 w-3 mr-1" />
                            {log.details.job_title}
                          </Badge>
                        )}
                        {log.details?.match_score && (
                          <Badge variant="secondary" className="text-xs">
                            {log.details.match_score}% match
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(log.created_at ?? new Date()), { addSuffix: true })}
                        </span>
                        {log.actor && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.actor.full_name}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Additional details */}
                      {log.details?.reason && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Reason: {log.details.reason}
                        </p>
                      )}
                      {log.details?.skills_extracted && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Extracted {log.details.skills_extracted} skills, {log.details.experience_entries || 0} experiences
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
