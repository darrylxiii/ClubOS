import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface HeartbeatLog {
  id: string;
  run_at: string;
  agents_invoked: string[];
  results: any;
  duration_ms: number | null;
  errors: any;
  created_at: string;
}

export default function AgenticHeartbeatLogs() {
  const [logs, setLogs] = useState<HeartbeatLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('agentic_heartbeat_log')
        .select('*')
        .order('run_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-6 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Run At</TableHead>
            <TableHead>Agents Invoked</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Events Processed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No heartbeat logs yet
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm">
                  {formatDistanceToNow(new Date(log.run_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {log.agents_invoked?.map((agent) => (
                      <Badge key={agent} variant="secondary" className="text-xs">
                        {agent}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {log.duration_ms ? `${log.duration_ms}ms` : '—'}
                </TableCell>
                <TableCell>
                  {log.errors ? (
                    <Badge variant="destructive" className="text-xs">
                      Error
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-xs">
                      Success
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {log.results?.events_processed || 0}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
