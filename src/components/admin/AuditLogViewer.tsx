import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Search, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import { format } from 'date-fns';

interface AuditEvent {
  id: string;
  event_type: string;
  actor_email: string | null;
  actor_role: string | null;
  resource_type: string | null;
  action: string;
  result: string;
  ip_address: string | null;
  created_at: string;
  metadata: any;
}

export const AuditLogViewer = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');

  useEffect(() => {
    loadAuditEvents();
  }, [eventTypeFilter, resultFilter]);

  const loadAuditEvents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventTypeFilter !== 'all') {
        query = query.eq('event_type', eventTypeFilter);
      }

      if (resultFilter !== 'all') {
        query = query.eq('result', resultFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents((data || []) as AuditEvent[]);
    } catch (error: unknown) {
      notify.error('Failed to Load Audit Logs', { description: error instanceof Error ? error.message : 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Event Type', 'Actor', 'Role', 'Resource', 'Action', 'Result', 'IP Address'];
    const rows = filteredEvents.map(event => [
      format(new Date(event.created_at), 'yyyy-MM-dd HH:mm:ss'),
      event.event_type,
      event.actor_email || 'System',
      event.actor_role || 'N/A',
      event.resource_type || 'N/A',
      event.action,
      event.result,
      event.ip_address || 'N/A',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();

    notify.success('Export Complete', { description: 'Audit logs exported to CSV' });
  };

  const filteredEvents = events.filter(event => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      event.actor_email?.toLowerCase().includes(search) ||
      event.event_type?.toLowerCase().includes(search) ||
      event.action?.toLowerCase().includes(search) ||
      event.resource_type?.toLowerCase().includes(search)
    );
  });

  const getResultBadge = (result: string) => {
    const variants: any = {
      success: 'default',
      failed: 'destructive',
      denied: 'secondary',
    };
    return <Badge variant={variants[result] || 'default'}>{result}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Audit Log
        </CardTitle>
        <CardDescription>
          Complete audit trail of system activity and security events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, action, or resource..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="data_access">Data Access</SelectItem>
              <SelectItem value="role_change">Role Change</SelectItem>
              <SelectItem value="gdpr_export">GDPR Export</SelectItem>
              <SelectItem value="gdpr_deletion_requested">Deletion Request</SelectItem>
            </SelectContent>
          </Select>
          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline" size="icon">
            <Download className="w-4 h-4" />
          </Button>
        </div>

        {/* Events Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium">Timestamp</th>
                  <th className="text-left p-3 text-sm font-medium">Event</th>
                  <th className="text-left p-3 text-sm font-medium">Actor</th>
                  <th className="text-left p-3 text-sm font-medium">Action</th>
                  <th className="text-left p-3 text-sm font-medium">Result</th>
                  <th className="text-left p-3 text-sm font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">
                      Loading audit events...
                    </td>
                  </tr>
                ) : filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">
                      No audit events found
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((event) => (
                    <tr key={event.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-sm">
                        {format(new Date(event.created_at), 'MMM dd, HH:mm:ss')}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {event.event_type}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="space-y-1">
                          <div className="font-medium">{event.actor_email || 'System'}</div>
                          {event.actor_role && (
                            <div className="text-xs text-muted-foreground">{event.actor_role}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="space-y-1">
                          <div>{event.action}</div>
                          {event.resource_type && (
                            <div className="text-xs text-muted-foreground">{event.resource_type}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">{getResultBadge(event.result)}</td>
                      <td className="p-3 text-sm font-mono text-muted-foreground">
                        {event.ip_address || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-sm text-muted-foreground text-center">
          Showing {filteredEvents.length} of {events.length} events
        </div>
      </CardContent>
    </Card>
  );
};
