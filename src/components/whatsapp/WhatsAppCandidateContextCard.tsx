import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { User, ChevronRight } from 'lucide-react';
import { useWhatsAppCandidateContext } from '@/hooks/useWhatsAppCandidateContext';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Props {
  candidateId: string | null;
  candidatePhone?: string;
  candidateName?: string;
  compact?: boolean;
}

const tierConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  hot: { label: 'Hot', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  warm: { label: 'Warm', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  strategic: { label: 'Strategic', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  pool: { label: 'Pool', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
};

export function WhatsAppCandidateContextCard({ 
  candidateId, 
  candidatePhone,
  candidateName,
  compact = false 
}: Props) {
  const { candidate, loading } = useWhatsAppCandidateContext(candidateId);
  const navigate = useNavigate();

  if (!candidateId) {
    return (
      <div className="p-3 border rounded-lg bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-muted">
              <User className="w-5 h-5 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {candidateName || candidatePhone || 'Unknown'}
            </p>
            {candidatePhone && candidateName && (
              <p className="text-xs text-muted-foreground">{candidatePhone}</p>
            )}
          </div>
          <Badge variant="outline" className="text-xs">Unlinked</Badge>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-3 border rounded-lg bg-card space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!candidate) return null;

  const tier = tierConfig[candidate.talent_tier || 'pool'] || tierConfig.pool;
  const initials = candidate.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || '?';

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
        <Avatar className="h-8 w-8">
          <AvatarImage src={candidate.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{candidate.full_name}</p>
          <p className="text-xs text-muted-foreground truncate">{candidate.current_title}</p>
        </div>
        <Badge variant="outline" className={cn('text-xs', tier.color, tier.bgColor)}>
          {tier.label}
        </Badge>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="p-3 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={candidate.avatar_url || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{candidate.full_name}</p>
              <Badge variant="outline" className={cn('text-xs shrink-0', tier.color, tier.bgColor)}>
                {tier.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {candidate.current_title}
              {candidate.current_company && ` at ${candidate.current_company}`}
            </p>
          </div>
        </div>
      </div>
      <div className="p-2 border-t bg-muted/20">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs h-8 justify-between"
          onClick={() => navigate(`/candidate/${candidate.id}`)}
        >
          View Full Profile
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
