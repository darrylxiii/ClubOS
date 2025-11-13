import { useEffect, useState } from "react";
import { candidateAuditService, AuditLogEntry } from "@/services/candidateAuditService";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CandidateEditHistoryProps {
  candidateId: string;
}

export function CandidateEditHistory({ candidateId }: CandidateEditHistoryProps) {
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [candidateId]);

  const loadHistory = async () => {
    setLoading(true);
    const { data } = await candidateAuditService.getCandidateAuditHistory(candidateId);
    if (data) {
      setHistory(data);
    }
    setLoading(false);
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'create':
        return 'default';
      case 'update':
        return 'secondary';
      case 'soft_delete':
        return 'outline';
      case 'hard_delete':
        return 'destructive';
      case 'restore':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create':
        return 'Created';
      case 'update':
        return 'Updated';
      case 'soft_delete':
        return 'Archived';
      case 'hard_delete':
        return 'Deleted';
      case 'restore':
        return 'Restored';
      default:
        return action;
    }
  };

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value === '') return '(empty)';
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No edit history available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((entry) => (
        <Card key={entry.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.performed_by_profile?.avatar_url} />
                  <AvatarFallback>
                    {entry.performed_by_profile?.full_name?.substring(0, 2)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {entry.performed_by_profile?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.performed_at))} ago
                  </p>
                </div>
              </div>
              <Badge variant={getActionBadgeVariant(entry.action) as any}>
                {getActionLabel(entry.action)}
                {entry.is_bulk_action && ' (Bulk)'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {entry.reason && (
              <div>
                <p className="text-sm font-semibold mb-1">Reason:</p>
                <p className="text-sm text-muted-foreground">{entry.reason}</p>
              </div>
            )}

            {entry.changed_fields && entry.changed_fields.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-3">
                  Changed {entry.changed_fields.length} field{entry.changed_fields.length !== 1 ? 's' : ''}:
                </p>
                <div className="space-y-3">
                  {entry.changed_fields.map((field) => (
                    <div
                      key={field}
                      className="grid grid-cols-[200px_1fr_1fr] gap-4 text-sm border-l-2 border-muted pl-4 py-2"
                    >
                      <div className="font-mono text-muted-foreground font-medium">
                        {field}
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Before:</span>
                        <span className="text-destructive line-through">
                          {formatFieldValue(entry.before_data?.[field])}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">After:</span>
                        <span className="text-green-600 font-medium">
                          {formatFieldValue(entry.after_data?.[field])}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Additional Info:</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  {Object.entries(entry.metadata).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-mono">{key}:</span> {JSON.stringify(value)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(entry.before_data || entry.after_data) && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full">
                    <ChevronDown className="mr-2 h-4 w-4" />
                    View Full Data Diff
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="text-xs bg-muted p-4 rounded-md mt-2 overflow-auto max-h-96">
                    {JSON.stringify(
                      {
                        before: entry.before_data,
                        after: entry.after_data,
                      },
                      null,
                      2
                    )}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
