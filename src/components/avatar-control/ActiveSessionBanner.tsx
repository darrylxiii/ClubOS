import { useActiveAvatarSession } from '@/hooks/useAvatarSessions';
import { Button } from '@/components/ui/button';
import { Radio, Clock, X } from 'lucide-react';
import { format } from 'date-fns';

export function ActiveSessionBanner() {
  const { mySession, endSession } = useActiveAvatarSession();

  if (!mySession) return null;

  const accountLabel = mySession.linkedin_avatar_accounts?.label ?? 'Unknown Account';

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 flex items-center justify-between gap-3 mx-4 mt-2">
      <div className="flex items-center gap-3 min-w-0">
        <Radio className="h-4 w-4 text-red-400 animate-pulse shrink-0" />
        <div className="min-w-0 text-sm">
          <span className="font-medium">Active session:</span>{' '}
          <span className="text-muted-foreground">{accountLabel}</span>
          <span className="text-muted-foreground mx-1.5">·</span>
          <Clock className="h-3 w-3 inline -mt-0.5 text-muted-foreground" />{' '}
          <span className="text-muted-foreground">
            until {format(new Date(mySession.expected_end_at), 'HH:mm')}
          </span>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0"
        onClick={() => endSession.mutate(mySession.id)}
        disabled={endSession.isPending}
      >
        <X className="h-3.5 w-3.5 mr-1" />
        End Session
      </Button>
    </div>
  );
}
