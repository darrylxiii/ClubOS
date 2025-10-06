import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Plus, Trash2, Edit2, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  action: string;
  stage_data: any;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface PipelineAuditLogProps {
  jobId: string;
}

export const PipelineAuditLog = ({ jobId }: PipelineAuditLogProps) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`pipeline-audit-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pipeline_audit_logs',
          filter: `job_id=eq.${jobId}`
        },
        () => fetchAuditLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('pipeline_audit_logs')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(log => log.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const enrichedLogs = data.map(log => ({
          ...log,
          profiles: profileMap.get(log.user_id) || { full_name: 'Unknown User' }
        }));

        setLogs(enrichedLogs as any);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'stage_added': return Plus;
      case 'stage_removed': return Trash2;
      case 'stage_updated': return Edit2;
      case 'stage_reordered': return ArrowUpDown;
      default: return Shield;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'stage_added': return 'bg-accent/20 text-accent border-accent/30';
      case 'stage_removed': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'stage_updated': return 'bg-primary/20 text-primary border-primary/30';
      case 'stage_reordered': return 'bg-secondary/20 text-secondary border-secondary/30';
      default: return 'bg-muted';
    }
  };

  const getActionLabel = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <Card className="border-2">
        <CardContent className="py-8">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-accent/20 backdrop-blur-xl bg-background/90">
      <CardHeader className="border-b border-border/50">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-accent" />
          <CardTitle className="text-lg font-black uppercase">
            White Glove Audit Log
          </CardTitle>
        </div>
        <CardDescription>
          Secure, comprehensive tracking of all pipeline modifications
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                No audit logs yet. All changes will be tracked here.
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-4">
              {logs.map((log) => {
                const ActionIcon = getActionIcon(log.action);
                return (
                  <div
                    key={log.id}
                    className="group flex items-start gap-3 p-3 rounded-lg hover:bg-accent/5 transition-colors duration-200"
                  >
                    <div className={`p-2 rounded-lg ${getActionColor(log.action)} shrink-0`}>
                      <ActionIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs font-semibold ${getActionColor(log.action)}`}
                            >
                              {getActionLabel(log.action)}
                            </Badge>
                            <span className="text-sm font-medium">
                              by {log.profiles?.full_name || 'Unknown'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {log.stage_data?.stage?.name && (
                              <span className="font-medium text-foreground">
                                "{log.stage_data.stage.name}"
                              </span>
                            )}
                            {log.stage_data?.stages && (
                              <span className="font-medium text-foreground">
                                {log.stage_data.stages.length} stages modified
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
