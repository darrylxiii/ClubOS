import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  Search, 
  Filter, 
  Download,
  User,
  Shield,
  Settings,
  FileText,
  Clock,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

interface AuditEvent {
  id: string;
  event_type: string;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  resource_type: string | null;
  resource_id: string | null;
  result: string | null;
  metadata: unknown;
  created_at: string;
}

export default function AdminAuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchAuditEvents = async () => {
    try {
      let query = supabase
        .from('audit_events')
        .select('id, event_type, action, actor_id, actor_email, actor_role, resource_type, resource_id, result, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventTypeFilter !== "all") {
        query = query.eq('event_type', eventTypeFilter);
      }

      if (searchQuery) {
        query = query.or(`action.ilike.%${searchQuery}%,actor_email.ilike.%${searchQuery}%,resource_type.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents((data || []) as AuditEvent[]);
    } catch (error) {
      console.error('Error fetching audit events:', error);
      toast.error("Failed to load audit events");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuditEvents();
  }, [eventTypeFilter, searchQuery]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAuditEvents();
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'auth':
        return <Shield className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      case 'settings':
        return <Settings className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getResultBadge = (result: string | null) => {
    if (!result) return null;
    switch (result.toLowerCase()) {
      case 'success':
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">Success</Badge>;
      case 'failure':
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'blocked':
        return <Badge variant="outline" className="border-amber-500/30 text-amber-400">Blocked</Badge>;
      default:
        return <Badge variant="secondary">{result}</Badge>;
    }
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Event Type', 'Action', 'Actor Email', 'Resource Type', 'Result'];
    const rows = events.map(e => [
      format(new Date(e.created_at), 'yyyy-MM-dd HH:mm:ss'),
      e.event_type,
      e.action,
      e.actor_email || 'N/A',
      e.resource_type || 'N/A',
      e.result || 'N/A'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit log exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">System Audit Log</h1>
          <p className="text-muted-foreground">Track all system events and user actions</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by action, email, or resource..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="auth">Authentication</SelectItem>
                <SelectItem value="user">User Actions</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="security">Security</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Events
          </CardTitle>
          <CardDescription>
            Showing last 100 events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-lg border border-border/50">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No audit events found</p>
                <p className="text-sm text-muted-foreground/70">Events will appear here as actions are performed</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div 
                    key={event.id} 
                    className="flex items-start gap-4 p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {getEventIcon(event.event_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{event.action}</span>
                        {getResultBadge(event.result)}
                        <Badge variant="outline" className="text-xs">
                          {event.event_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {event.actor_email && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {event.actor_email}
                          </span>
                        )}
                        {event.resource_type && (
                          <span>
                            {event.resource_type}
                            {event.resource_id && `: ${event.resource_id.slice(0, 8)}...`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground/70">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.created_at), 'MMM d, yyyy HH:mm:ss')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
