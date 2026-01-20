import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  History, 
  CheckCircle, 
  Search, 
  Download,
  Calendar,
  User,
  Clock
} from 'lucide-react';
import { useThreatEvents } from '@/hooks/useThreatDetection';
import { ThreatEvent, ThreatSeverity } from '@/types/threat';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

const severityColors: Record<ThreatSeverity, string> = {
  critical: 'text-destructive bg-destructive/10',
  high: 'text-orange-500 bg-orange-500/10',
  medium: 'text-yellow-500 bg-yellow-500/10',
  low: 'text-blue-500 bg-blue-500/10',
};

export function ThreatHistory() {
  const { data: threats, isLoading } = useThreatEvents(100);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'resolved' | 'unresolved'>('resolved');

  const filteredThreats = threats?.filter(t => {
    const matchesSearch = !search || 
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.ip_address?.includes(search) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.event_type.includes(search.toLowerCase());
    
    if (filter === 'resolved') return t.is_resolved && matchesSearch;
    if (filter === 'unresolved') return !t.is_resolved && matchesSearch;
    return matchesSearch;
  }) || [];

  const handleExport = () => {
    const csv = [
      ['ID', 'Type', 'Severity', 'IP', 'Email', 'Description', 'Status', 'Created', 'Resolved', 'Resolution Notes'].join(','),
      ...filteredThreats.map(t => [
        t.id,
        t.event_type,
        t.severity,
        t.ip_address || '',
        t.email || '',
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.is_resolved ? 'Resolved' : 'Active',
        format(new Date(t.created_at), 'yyyy-MM-dd HH:mm:ss'),
        t.resolved_at ? format(new Date(t.resolved_at), 'yyyy-MM-dd HH:mm:ss') : '',
        `"${(t.resolution_notes || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Threat History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Threat History
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{filteredThreats.length} records</Badge>
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by IP, email, type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'resolved', 'unresolved'] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="h-[500px]">
          {filteredThreats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <History className="h-8 w-8 mb-2" />
              <span>No threat history found</span>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredThreats.map((threat) => (
                <div
                  key={threat.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn("text-xs", severityColors[threat.severity])}>
                          {threat.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {threat.event_type.replace(/_/g, ' ')}
                        </Badge>
                        {threat.is_resolved ? (
                          <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolved
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm mt-2">{threat.description}</p>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        {threat.ip_address && (
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                            {threat.ip_address}
                          </span>
                        )}
                        {threat.email && (
                          <span>{threat.email}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(threat.created_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>

                      {threat.is_resolved && (
                        <div className="mt-2 pt-2 border-t border-dashed text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>
                              Resolved {threat.resolved_at && formatDistanceToNow(new Date(threat.resolved_at), { addSuffix: true })}
                            </span>
                          </div>
                          {threat.resolution_notes && (
                            <p className="mt-1 italic">{threat.resolution_notes}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
