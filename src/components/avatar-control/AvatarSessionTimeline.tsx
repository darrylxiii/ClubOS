import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, User, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

interface AvatarSessionTimelineProps {
  accountId: string;
}

const statusIcons: Record<string, typeof CheckCircle> = {
  completed: CheckCircle,
  timeout: AlertTriangle,
  force_closed: XCircle,
  active: Clock,
};

const statusColors: Record<string, string> = {
  completed: 'text-emerald-400',
  timeout: 'text-amber-400',
  force_closed: 'text-red-400',
  active: 'text-blue-400',
};

export function AvatarSessionTimeline({ accountId }: AvatarSessionTimelineProps) {
  const { data: sessions = [] } = useQuery({
    queryKey: ['avatar-session-timeline', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('linkedin_avatar_sessions')
        .select('*, profiles(full_name)')
        .eq('account_id', accountId)
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No session history yet.</p>;
  }

  return (
    <div className="space-y-2">
      {sessions.map((session: any) => {
        const Icon = statusIcons[session.status] ?? Clock;
        const duration = session.ended_at
          ? differenceInMinutes(new Date(session.ended_at), new Date(session.started_at))
          : null;
        return (
          <div key={session.id} className="flex items-start gap-3 text-xs py-2 border-b border-border/50 last:border-0">
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${statusColors[session.status] ?? ''}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{session.profiles?.full_name ?? 'Unknown'}</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0">{session.status}</Badge>
              </div>
              <p className="text-muted-foreground mt-0.5">
                {format(new Date(session.started_at), 'MMM d, HH:mm')}
                {duration !== null && ` · ${duration}m`}
                {session.purpose && ` · ${session.purpose}`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
