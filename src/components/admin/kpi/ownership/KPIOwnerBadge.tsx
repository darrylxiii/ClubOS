import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { User, AlertTriangle, Clock } from 'lucide-react';
import { useKPIOwnership, KPIOwnership } from '@/hooks/useKPIOwnership';
import { formatDistanceToNow } from 'date-fns';

interface KPIOwnerBadgeProps {
  kpiName: string;
  compact?: boolean;
  showReviewStatus?: boolean;
}

export function KPIOwnerBadge({ kpiName, compact = false, showReviewStatus = false }: KPIOwnerBadgeProps) {
  const { getOwnerForKPI } = useKPIOwnership();
  const ownership = getOwnerForKPI(kpiName);

  if (!ownership?.owner_user_id && !ownership?.owner_role) {
    if (compact) return null;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 text-muted-foreground border-dashed">
              <User className="h-3 w-3" />
              <span className="text-xs">Unassigned</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This KPI has no owner assigned</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const ownerName = ownership.owner_profile?.full_name || ownership.owner_role || 'Unknown';
  const initials = ownerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  const isOverdueForReview = ownership.next_review_at && new Date(ownership.next_review_at) < new Date();
  const reviewStatus = ownership.last_reviewed_at 
    ? `Last reviewed ${formatDistanceToNow(new Date(ownership.last_reviewed_at))} ago`
    : 'Never reviewed';

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className="h-6 w-6 border-2 border-background">
              <AvatarImage src={ownership.owner_profile?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{ownerName}</p>
              {showReviewStatus && (
                <p className="text-xs text-muted-foreground">{reviewStatus}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 border-2 border-background">
              <AvatarImage src={ownership.owner_profile?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              {ownerName}
            </span>
            {showReviewStatus && isOverdueForReview && (
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{ownerName}</p>
            <p className="text-xs text-muted-foreground">{reviewStatus}</p>
            {ownership.backup_owner_profile && (
              <p className="text-xs">
                Backup: {ownership.backup_owner_profile.full_name}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
