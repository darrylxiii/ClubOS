import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, Shield, Play, User } from 'lucide-react';
import { AvatarAccount } from '@/hooks/useAvatarAccounts';
import { AvatarSession } from '@/hooks/useAvatarSessions';
import { format } from 'date-fns';

interface AvatarAccountCardProps {
  account: AvatarAccount;
  activeSession?: AvatarSession | null;
  onStartSession: (account: AvatarAccount) => void;
}

const statusColors: Record<string, string> = {
  available: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  paused: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  banned: 'bg-red-500/20 text-red-400 border-red-500/30',
  needs_review: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const riskColors: Record<string, string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-red-400',
};

export function AvatarAccountCard({ account, activeSession, onStartSession }: AvatarAccountCardProps) {
  const isInUse = !!activeSession;
  const isAvailable = account.status === 'available' && !isInUse;
  const userName = activeSession?.profiles?.full_name ?? 'Unknown';

  return (
    <Card className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
      isInUse ? 'border-red-500/40 bg-red-500/5' : isAvailable ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'opacity-70'
    }`}>
      {/* Status strip */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        isInUse ? 'bg-red-500' : isAvailable ? 'bg-emerald-500' : 'bg-amber-500'
      }`} />

      <CardContent className="pt-5 pb-4 px-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{account.label}</h3>
            {account.owner_team && (
              <p className="text-xs text-muted-foreground mt-0.5">{account.owner_team}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Shield className={`h-3.5 w-3.5 ${riskColors[account.risk_level] ?? 'text-muted-foreground'}`} />
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[account.status] ?? ''}`}>
              {isInUse ? 'In Use' : account.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Active session info */}
        {isInUse && activeSession && (
          <div className="flex items-center gap-2 bg-red-500/10 rounded-md p-2 text-xs">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-red-500/20">
                {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{userName}</p>
              <p className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Until {format(new Date(activeSession.expected_end_at), 'HH:mm')}
              </p>
            </div>
          </div>
        )}

        {activeSession?.purpose && (
          <p className="text-xs text-muted-foreground truncate">
            {activeSession.purpose}
          </p>
        )}

        {/* Action */}
        {isAvailable ? (
          <Button
            size="sm"
            className="w-full"
            onClick={() => onStartSession(account)}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Start Session
          </Button>
        ) : !isInUse ? (
          <div className="text-xs text-muted-foreground text-center py-1">
            Account {account.status.replace('_', ' ')}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
