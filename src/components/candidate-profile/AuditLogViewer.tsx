import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { candidateAuditService, AuditLogEntry } from '@/services/candidateAuditService';
import { formatDistanceToNow } from 'date-fns';
import { Clock, User, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AuditLogViewerProps {
  candidateId: string;
}

export function AuditLogViewer({ candidateId }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditHistory();
  }, [candidateId]);

  const loadAuditHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await candidateAuditService.getCandidateAuditHistory(candidateId);
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading audit history:', error);
      toast.error('Failed to load audit history');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      create: 'default',
      update: 'secondary',
      soft_delete: 'destructive',
      hard_delete: 'destructive',
      restore: 'outline',
    };
    return (
      <Badge variant={variants[action] || 'default'}>
        {action.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const renderFieldChange = (field: string, before: any, after: any) => {
    return (
      <div key={field} className="text-sm space-y-1">
        <p className="font-medium text-foreground">{field.replace(/_/g, ' ').toUpperCase()}</p>
        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
          <div className="space-y-1">
            <p className="text-xs font-semibold">Before:</p>
            <p className="text-xs break-all">{before ? JSON.stringify(before) : 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold">After:</p>
            <p className="text-xs break-all">{after ? JSON.stringify(after) : 'N/A'}</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading audit history...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Audit Log
          </CardTitle>
          <CardDescription>Complete history of profile changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="w-5 h-5 mr-2" />
            No audit history available for this candidate.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Audit Log
        </CardTitle>
        <CardDescription>
          Complete history of profile changes ({logs.length} {logs.length === 1 ? 'entry' : 'entries'})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {logs.map((log, index) => (
              <div key={log.id}>
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={log.performed_by_profile?.avatar_url} />
                        <AvatarFallback>
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {log.performed_by_profile?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(log.performed_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {getActionBadge(log.action)}
                  </div>

                  {/* Reason */}
                  {log.reason && (
                    <div className="bg-muted/50 rounded-md p-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Reason:</p>
                      <p className="text-sm">{log.reason}</p>
                    </div>
                  )}

                  {/* Changed Fields */}
                  {log.changed_fields && log.changed_fields.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Changed Fields ({log.changed_fields.length}):
                      </p>
                      <div className="space-y-3 pl-4 border-l-2 border-muted">
                        {log.changed_fields.map(field => 
                          renderFieldChange(
                            field,
                            log.before_data?.[field],
                            log.after_data?.[field]
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  {log.metadata && (
                    <div className="text-xs text-muted-foreground">
                      <p>Via: {log.metadata.via || 'Unknown'}</p>
                      {log.is_bulk_action && (
                        <Badge variant="outline" className="mt-1">
                          Bulk Action
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {index < logs.length - 1 && <Separator className="my-6" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
