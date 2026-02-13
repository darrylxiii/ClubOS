import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface DailyBriefing {
  id: string;
  user_id: string;
  briefing_date: string;
  content: any;
  created_at: string;
}

export default function DailyBriefingsView() {
  const [briefings, setBriefings] = useState<DailyBriefing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBriefings = async () => {
      const { data, error } = await supabase
        .from('daily_briefings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setBriefings(data);
      }
      setLoading(false);
    };

    fetchBriefings();
    const interval = setInterval(fetchBriefings, 60000);
    return () => clearInterval(interval);
  }, []);

  const getHighlights = (content: any) => {
    if (!content) return [];
    return [
      content.signals_detected_count && `${content.signals_detected_count} signals`,
      content.stalled_candidates_count && `${content.stalled_candidates_count} stalled`,
      content.agent_actions_count && `${content.agent_actions_count} actions`,
    ].filter(Boolean);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-6 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Highlights</TableHead>
            <TableHead>Generated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {briefings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                No briefings generated yet
              </TableCell>
            </TableRow>
          ) : (
            briefings.map((briefing) => (
              <TableRow key={briefing.id}>
                <TableCell className="text-sm font-medium">
                  {new Date(briefing.briefing_date).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex flex-wrap gap-1">
                    {getHighlights(briefing.content).map((highlight, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {formatDistanceToNow(new Date(briefing.created_at), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
