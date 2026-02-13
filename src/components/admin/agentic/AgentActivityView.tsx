import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface AgentDecision {
  id: string;
  agent_name: string;
  decision_type: string;
  decision_made: string;
  confidence_score: number | null;
  was_overridden: boolean;
  created_at: string;
}

export default function AgentActivityView() {
  const [decisions, setDecisions] = useState<AgentDecision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDecisions = async () => {
      const { data, error } = await supabase
        .from('agent_decision_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setDecisions(data);
      }
      setLoading(false);
    };

    fetchDecisions();
    const interval = setInterval(fetchDecisions, 30000);
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
            <TableHead>Agent</TableHead>
            <TableHead>Decision Type</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {decisions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No agent activity yet
              </TableCell>
            </TableRow>
          ) : (
            decisions.map((decision) => (
              <TableRow key={decision.id}>
                <TableCell className="text-sm font-medium">{decision.agent_name}</TableCell>
                <TableCell className="text-sm">
                  <Badge variant="secondary">{decision.decision_type}</Badge>
                </TableCell>
                <TableCell className="text-sm max-w-xs truncate">
                  {decision.decision_made}
                </TableCell>
                <TableCell className="text-sm">
                  {decision.confidence_score ? `${Math.round(decision.confidence_score * 100)}%` : '—'}
                </TableCell>
                <TableCell>
                  {decision.was_overridden ? (
                    <Badge variant="destructive" className="text-xs">
                      Overridden
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDistanceToNow(new Date(decision.created_at), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
