import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ExternalLink, MessageSquare, ListPlus, Eye, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TierBadge, MoveProbabilityBadge } from './TierBadge';
import { TalentPoolCandidate, TalentTier } from '@/hooks/useTalentPool';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface TalentPoolTableProps {
  candidates: TalentPoolCandidate[];
  isLoading?: boolean;
  selectedIds?: string[];
  onSelectChange?: (ids: string[]) => void;
  onCandidateClick?: (candidate: TalentPoolCandidate) => void;
  onLogTouchpoint?: (candidate: TalentPoolCandidate) => void;
  onAddToList?: (candidate: TalentPoolCandidate) => void;
  onViewProfile?: (candidate: TalentPoolCandidate) => void;
  onTierChange?: (candidateId: string, tier: TalentTier) => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export function TalentPoolTable({
  candidates,
  isLoading,
  selectedIds = [],
  onSelectChange,
  onCandidateClick,
  onLogTouchpoint,
  onAddToList,
  onViewProfile,
  onTierChange,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: TalentPoolTableProps) {
  const [sortField, setSortField] = useState<'tier_score' | 'move_probability' | 'last_activity'>('tier_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const toggleSelectAll = () => {
    if (selectedIds.length === candidates.length) {
      onSelectChange?.([]);
    } else {
      onSelectChange?.(candidates.map((c) => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectChange?.(selectedIds.filter((i) => i !== id));
    } else {
      onSelectChange?.([...selectedIds, id]);
    }
  };

  const sortedCandidates = [...candidates].sort((a, b) => {
    let aVal: number | null = null;
    let bVal: number | null = null;

    switch (sortField) {
      case 'tier_score':
        aVal = a.tier_score;
        bVal = b.tier_score;
        break;
      case 'move_probability':
        aVal = a.move_probability;
        bVal = b.move_probability;
        break;
      case 'last_activity':
        aVal = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
        bVal = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
        break;
    }

    if (aVal === null) aVal = 0;
    if (bVal === null) bVal = 0;

    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No candidates found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIds.length === candidates.length && candidates.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead className="min-w-[250px]">Candidate</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="cursor-pointer" onClick={() => {
              if (sortField === 'tier_score') {
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              } else {
                setSortField('tier_score');
                setSortOrder('desc');
              }
            }}>
              <div className="flex items-center gap-1">
                Tier
                <ArrowUpDown className="h-3 w-3" />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => {
              if (sortField === 'move_probability') {
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              } else {
                setSortField('move_probability');
                setSortOrder('desc');
              }
            }}>
              <div className="flex items-center gap-1">
                Move %
                <ArrowUpDown className="h-3 w-3" />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => {
              if (sortField === 'last_activity') {
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              } else {
                setSortField('last_activity');
                setSortOrder('desc');
              }
            }}>
              <div className="flex items-center gap-1">
                Last Contact
                <ArrowUpDown className="h-3 w-3" />
              </div>
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCandidates.map((candidate) => {
            const initials = candidate.full_name
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || '??';

            const lastContact = candidate.relationship?.last_meaningful_contact
              ? formatDistanceToNow(new Date(candidate.relationship.last_meaningful_contact), { addSuffix: true })
              : candidate.last_activity_at
              ? formatDistanceToNow(new Date(candidate.last_activity_at), { addSuffix: true })
              : 'Never';

            return (
              <TableRow
                key={candidate.id}
                className={cn(
                  'cursor-pointer hover:bg-muted/50 transition-colors',
                  selectedIds.includes(candidate.id) && 'bg-primary/5'
                )}
                onClick={() => onCandidateClick?.(candidate)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(candidate.id)}
                    onCheckedChange={() => toggleSelect(candidate.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={candidate.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{candidate.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {candidate.current_title || 'No title'}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {candidate.current_company || '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {candidate.location || '-'}
                </TableCell>
                <TableCell>
                  <TierBadge tier={candidate.talent_tier} size="sm" />
                </TableCell>
                <TableCell>
                  {candidate.move_probability !== null ? (
                    <MoveProbabilityBadge probability={candidate.move_probability} size="sm" />
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {lastContact}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewProfile?.(candidate)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onLogTouchpoint?.(candidate)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Log Touchpoint
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAddToList?.(candidate)}>
                        <ListPlus className="h-4 w-4 mr-2" />
                        Add to List
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {candidate.linkedin_url && (
                        <DropdownMenuItem asChild>
                          <a
                            href={candidate.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open LinkedIn
                          </a>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      {/* Load More Button */}
      {hasNextPage && (
        <div className="p-4 border-t border-border/50 flex justify-center">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading...' : `Load More (${candidates.length} shown)`}
          </Button>
        </div>
      )}
    </div>
  );
}
