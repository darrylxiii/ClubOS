import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Download, 
  RefreshCw,
  User,
  Clock,
  Mail,
  Shield
} from "lucide-react";
import { 
  useNotificationAuditLog, 
  AUDIT_ACTIONS,
  AuditEntryWithDetails 
} from "@/hooks/useNotificationAuditLog";
import { formatDistanceToNow, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NotificationAuditLog() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: entries, isLoading, refetch, isFetching } = useNotificationAuditLog({
    action: actionFilter !== "all" ? actionFilter : undefined,
    limit: 100,
  });

  const filteredEntries = entries?.filter((entry) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.notification_type?.name?.toLowerCase().includes(query) ||
      entry.notification_type?.key?.toLowerCase().includes(query) ||
      entry.performer?.full_name?.toLowerCase().includes(query) ||
      entry.target_role?.toLowerCase().includes(query) ||
      entry.action.toLowerCase().includes(query)
    );
  });

  const getActionConfig = (action: string) => {
    return AUDIT_ACTIONS.find(a => a.key === action) || { 
      label: action, 
      color: 'text-muted-foreground' 
    };
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'sent':
        return Mail;
      case 'assigned':
      case 'unassigned':
        return User;
      default:
        return Shield;
    }
  };

  const exportToCSV = () => {
    if (!entries) return;
    
    const headers = ['Date', 'Action', 'Notification Type', 'Target', 'Performed By', 'Details'];
    const rows = entries.map(entry => [
      format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm:ss'),
      entry.action,
      entry.notification_type?.name || entry.notification_type_key || '-',
      entry.target_role || entry.target_user?.full_name || '-',
      entry.performer?.full_name || '-',
      JSON.stringify(entry.details || {}),
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search audit log..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {AUDIT_ACTIONS.map((action) => (
              <SelectItem key={action.key} value={action.key}>
                {action.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>

        <Button variant="outline" onClick={exportToCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Audit Log Entries */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-2">
          {filteredEntries?.length === 0 ? (
            <Card variant="static">
              <CardContent className="p-8 text-center">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No audit log entries found.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredEntries?.map((entry) => (
              <AuditLogEntry key={entry.id} entry={entry} getActionConfig={getActionConfig} getActionIcon={getActionIcon} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface AuditLogEntryProps {
  entry: AuditEntryWithDetails;
  getActionConfig: (action: string) => { label: string; color: string };
  getActionIcon: (action: string) => React.ComponentType<{ className?: string }>;
}

function AuditLogEntry({ entry, getActionConfig, getActionIcon }: AuditLogEntryProps) {
  const actionConfig = getActionConfig(entry.action);
  const ActionIcon = getActionIcon(entry.action);

  return (
    <Card variant="static">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg bg-muted flex-shrink-0 ${actionConfig.color}`}>
            <ActionIcon className="h-4 w-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={actionConfig.color}>
                {actionConfig.label}
              </Badge>
              {entry.notification_type && (
                <span className="text-sm font-medium">
                  {entry.notification_type.name}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {entry.target_role && (
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Role: {entry.target_role}
                </span>
              )}
              {entry.target_user && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {entry.target_user.full_name}
                </span>
              )}
              {entry.performer && (
                <span>
                  by {entry.performer.full_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
              </span>
            </div>

            {entry.details && Object.keys(entry.details).length > 0 && (
              <div className="mt-2 text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
                {JSON.stringify(entry.details, null, 2)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
