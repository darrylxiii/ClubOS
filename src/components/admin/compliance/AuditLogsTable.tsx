import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Search, Filter } from 'lucide-react';

export const AuditLogsTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['audit-logs', searchTerm, eventTypeFilter, page],
    queryFn: async () => {
      let query = (supabase as any)
        .from('comprehensive_audit_logs')
        .select('*')
        .order('event_timestamp', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (eventTypeFilter !== 'all') {
        query = query.eq('event_type', eventTypeFilter);
      }

      if (searchTerm) {
        query = query.or(`description.ilike.%${searchTerm}%,actor_email.ilike.%${searchTerm}%,resource_type.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000
  });

  const getEventTypeBadge = (eventType: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'authentication': 'default',
      'data_access': 'secondary',
      'data_modification': 'outline',
      'authorization': 'secondary',
      'configuration_change': 'destructive',
      'export': 'outline',
      'delete': 'destructive'
    };
    return variants[eventType] || 'default';
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search audit logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="authentication">Authentication</SelectItem>
            <SelectItem value="data_access">Data Access</SelectItem>
            <SelectItem value="data_modification">Data Modification</SelectItem>
            <SelectItem value="authorization">Authorization</SelectItem>
            <SelectItem value="configuration_change">Configuration</SelectItem>
            <SelectItem value="export">Export</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Event Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Loading audit logs...
                  </td>
                </tr>
              ) : auditLogs && auditLogs.length > 0 ? (
                auditLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.event_timestamp), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={getEventTypeBadge(log.event_type)}>
                        {log.event_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{log.actor_email || 'System'}</span>
                        <span className="text-xs text-muted-foreground">{log.actor_role}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant="outline">{log.action}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.resource_type && (
                        <div className="flex flex-col">
                          <span className="font-medium">{log.resource_type}</span>
                          {log.resource_name && (
                            <span className="text-xs text-muted-foreground truncate max-w-xs">
                              {log.resource_name}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm max-w-md truncate">
                      {log.description}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={log.success ? 'default' : 'destructive'}>
                        {log.success ? 'Success' : 'Failed'}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No audit logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {page * pageSize + 1} - {(page + 1) * pageSize} of audit logs
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-4 py-2 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={!auditLogs || auditLogs.length < pageSize}
            className="px-4 py-2 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
