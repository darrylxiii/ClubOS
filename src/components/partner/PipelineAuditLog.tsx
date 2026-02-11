import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Plus, Trash2, Edit2, ArrowUpDown, UserPlus, ArrowRight, XCircle, Eye, Linkedin, Mail, CheckCircle, Share2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface AuditLog {
  id: string;
  action: string;
  stage_data: any;
  metadata?: any;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface PipelineAuditLogProps {
  jobId: string;
}

const FILTER_GROUPS: Record<string, string[]> = {
  all: [],
  pipeline: [
    'stage_added', 'stage_removed', 'stage_updated', 'stage_reordered',
    'candidate_added', 'candidate_advanced', 'candidate_declined', 'stage_changed_manual',
  ],
  views: ['job_viewed'],
  imports: ['email_dump_created', 'email_dump_imported'],
  system: ['linkedin_synced', 'dossier_shared', 'job_edited'],
};

const FILTER_LABELS: Record<string, string> = {
  all: 'All',
  pipeline: 'Pipeline',
  views: 'Views',
  imports: 'Imports',
  system: 'System',
};

export const PipelineAuditLog = ({ jobId }: PipelineAuditLogProps) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    fetchAuditLogs();
    
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
        .limit(100);

      if (error) throw error;

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

  const filteredLogs = activeFilter === 'all'
    ? logs
    : logs.filter(log => FILTER_GROUPS[activeFilter]?.includes(log.action));

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'stage_added': return Plus;
      case 'stage_removed': return Trash2;
      case 'stage_updated': return Edit2;
      case 'stage_reordered': return ArrowUpDown;
      case 'candidate_added': return UserPlus;
      case 'candidate_advanced': return ArrowRight;
      case 'candidate_declined': return XCircle;
      case 'stage_changed_manual': return ArrowUpDown;
      case 'job_viewed': return Eye;
      case 'email_dump_created': return Mail;
      case 'email_dump_imported': return CheckCircle;
      case 'linkedin_synced': return Linkedin;
      case 'dossier_shared': return Share2;
      case 'job_edited': return Edit2;
      default: return Shield;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'stage_added': return 'bg-accent/20 text-accent border-accent/30';
      case 'stage_removed': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'stage_updated': return 'bg-primary/20 text-primary border-primary/30';
      case 'stage_reordered': return 'bg-secondary/20 text-secondary border-secondary/30';
      case 'candidate_added': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'candidate_advanced': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'candidate_declined': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'stage_changed_manual': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'job_viewed': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'email_dump_created': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'email_dump_imported': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'linkedin_synced': return 'bg-blue-600/10 text-blue-600 border-blue-600/20';
      case 'dossier_shared': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'job_edited': return 'bg-primary/20 text-primary border-primary/30';
      default: return 'bg-muted';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'stage_added': 'Stage Added',
      'stage_removed': 'Stage Removed',
      'stage_updated': 'Stage Updated',
      'stage_reordered': 'Stage Reordered',
      'candidate_added': 'Candidate Added',
      'candidate_advanced': 'Candidate Advanced',
      'candidate_declined': 'Candidate Declined',
      'stage_changed_manual': 'Stage Changed',
      'job_viewed': 'Page Viewed',
      'email_dump_created': 'Email Dump',
      'email_dump_imported': 'Dump Imported',
      'linkedin_synced': 'LinkedIn Sync',
      'dossier_shared': 'Dossier Shared',
      'job_edited': 'Job Edited',
    };
    return labels[action] || action.split('_').map(word => 
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
            Job Audit Log
          </CardTitle>
        </div>
        <CardDescription>
          Comprehensive tracking of all job interactions and modifications
        </CardDescription>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2 pt-2">
          {Object.keys(FILTER_GROUPS).map((key) => {
            const count = key === 'all'
              ? logs.length
              : logs.filter(l => FILTER_GROUPS[key]?.includes(l.action)).length;
            return (
              <Button
                key={key}
                variant={activeFilter === key ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setActiveFilter(key)}
              >
                {FILTER_LABELS[key]}
                <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                {activeFilter === 'all'
                  ? 'No audit logs yet. All changes will be tracked here.'
                  : `No ${FILTER_LABELS[activeFilter]?.toLowerCase()} events found.`}
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-4">
              {filteredLogs.map((log) => {
                const ActionIcon = getActionIcon(log.action);
                const relativeTime = formatDistanceToNow(new Date(log.created_at), { addSuffix: true });
                const fullDate = format(new Date(log.created_at), 'MMM d, yyyy · HH:mm');

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
                              by {log.profiles?.full_name || log.metadata?.viewer_name || 'Unknown'}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            {log.stage_data?.stage?.name && (
                              <p>
                                <span className="font-medium text-foreground">
                                  "{log.stage_data.stage.name}"
                                </span>
                              </p>
                            )}
                            {log.stage_data?.stages && (
                              <p>
                                <span className="font-medium text-foreground">
                                  {log.stage_data.stages.length} stages modified
                                </span>
                              </p>
                            )}
                            
                            {/* Candidate Added Details */}
                            {log.action === 'candidate_added' && (
                              <div className="mt-1">
                                <p className="text-foreground">
                                  Added <span className="font-medium">{log.stage_data?.candidate_name}</span> to {log.stage_data?.starting_stage_name}
                                </p>
                                <div className="flex gap-1 mt-1">
                                  {log.stage_data?.linkedin_imported && (
                                    <Badge variant="secondary" className="text-xs h-5">
                                      <Linkedin className="w-3 h-3 mr-1" />
                                      LinkedIn Import
                                    </Badge>
                                  )}
                                  {log.metadata?.duplicate_override && (
                                    <Badge variant="destructive" className="text-xs h-5">
                                      Override Duplicate
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Candidate Advanced Details */}
                            {log.action === 'candidate_advanced' && (
                              <div className="mt-1">
                                <p className="text-foreground">
                                  <span className="font-medium">{log.stage_data?.candidate_name}</span>
                                  {' '}<ArrowRight className="w-3 h-3 inline" />{' '}
                                  {log.stage_data?.from_stage} → {log.stage_data?.to_stage}
                                </p>
                                {log.stage_data?.skills_match && (
                                  <div className="flex gap-1 mt-1">
                                    <Badge variant="outline" className="text-xs h-5">Skills: {log.stage_data.skills_match}/10</Badge>
                                    <Badge variant="outline" className="text-xs h-5">Culture: {log.stage_data.culture_fit}/10</Badge>
                                    <Badge variant="outline" className="text-xs h-5">Comm: {log.stage_data.communication}/10</Badge>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Candidate Declined Details */}
                            {log.action === 'candidate_declined' && (
                              <div className="mt-1">
                                <p className="text-foreground">
                                  <span className="font-medium">{log.stage_data?.candidate_name}</span> declined at {log.stage_data?.stage}
                                </p>
                                <Badge variant="destructive" className="text-xs h-5 mt-1">
                                  {log.stage_data?.rejection_label || log.stage_data?.rejection_reason}
                                </Badge>
                              </div>
                            )}

                            {/* Manual Stage Change Details */}
                            {log.action === 'stage_changed_manual' && (
                              <p className="text-foreground mt-1">
                                <span className="font-medium">{log.stage_data?.candidate_name}</span> moved from {log.stage_data?.from_stage_name} → {log.stage_data?.to_stage_name}
                              </p>
                            )}

                            {/* Job Viewed Details */}
                            {log.action === 'job_viewed' && (
                              <p className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                Viewed dashboard
                                {log.metadata?.viewer_role && (
                                  <Badge variant="secondary" className="text-[10px] h-4 ml-1">
                                    {log.metadata.viewer_role}
                                  </Badge>
                                )}
                              </p>
                            )}

                            {/* Email Dump Created Details */}
                            {log.action === 'email_dump_created' && (
                              <div className="mt-1">
                                <p className="text-foreground">
                                  Created email dump — <span className="font-medium">{log.stage_data?.candidate_count || 0} candidates</span> extracted
                                </p>
                                {log.stage_data?.linkedin_count > 0 && (
                                  <Badge variant="secondary" className="text-xs h-5 mt-1">
                                    <Linkedin className="w-3 h-3 mr-1" />
                                    {log.stage_data.linkedin_count} LinkedIn profiles
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Email Dump Imported Details */}
                            {log.action === 'email_dump_imported' && (
                              <div className="mt-1">
                                <p className="text-foreground">
                                  Imported <span className="font-medium">{log.stage_data?.imported_count || 0} candidates</span>
                                  {log.stage_data?.skipped_count > 0 && (
                                    <span className="text-muted-foreground">, {log.stage_data.skipped_count} skipped (duplicates)</span>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <span
                          className="text-xs text-muted-foreground whitespace-nowrap cursor-default"
                          title={fullDate}
                        >
                          {relativeTime}
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
