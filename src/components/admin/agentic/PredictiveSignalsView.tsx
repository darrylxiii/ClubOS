import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Flame, Snowflake, AlertCircle } from 'lucide-react';

interface PredictiveSignal {
  id: string;
  signal_type: string;
  entity_type: string;
  entity_id: string;
  signal_strength: number;
  is_active: boolean;
  acknowledged: boolean;
  created_at: string;
}

export default function PredictiveSignalsView() {
  const [signals, setSignals] = useState<PredictiveSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignals = async () => {
      const { data, error } = await supabase
        .from('predictive_signals')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setSignals(data);
      }
      setLoading(false);
    };

    fetchSignals();
    const subscription = supabase
      .channel('predictive_signals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictive_signals' }, () => {
        fetchSignals();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getSignalIcon = (type: string) => {
    if (type?.includes('heat')) return <Flame className="h-4 w-4" style={{ color: 'rgb(234, 88, 12)' }} />;
    if (type?.includes('cool')) return <Snowflake className="h-4 w-4" style={{ color: 'rgb(59, 130, 246)' }} />;
    return <AlertCircle className="h-4 w-4" style={{ color: 'rgb(234, 179, 8)' }} />;
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 0.8) return 'destructive';
    if (strength >= 0.6) return 'default';
    return 'secondary';
  };

  const handleAcknowledge = async (signalId: string) => {
    await supabase
      .from('predictive_signals')
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq('id', signalId);

    setSignals((prev) => prev.map((s) => (s.id === signalId ? { ...s, acknowledged: true } : s)));
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-6 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Signal Type</TableHead>
            <TableHead>Entity Type</TableHead>
            <TableHead>Strength</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signals.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No active signals
              </TableCell>
            </TableRow>
          ) : (
            signals.map((signal) => (
              <TableRow key={signal.id}>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-2">
                    {getSignalIcon(signal.signal_type)}
                    <span>{signal.signal_type || 'Unknown'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{signal.entity_type}</TableCell>
                <TableCell>
                  <Badge variant={getStrengthColor(signal.signal_strength)}>
                    {Math.round(signal.signal_strength * 100)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  {signal.acknowledged ? (
                    <Badge variant="outline" className="text-xs">
                      Acknowledged
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-xs">
                      New
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {!signal.acknowledged && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAcknowledge(signal.id)}
                    >
                      Ack
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
