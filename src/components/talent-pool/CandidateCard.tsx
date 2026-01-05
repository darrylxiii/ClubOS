import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, MapPin, Briefcase, MoreVertical, ExternalLink, MessageSquare, ListPlus, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TierBadge, MoveProbabilityBadge } from './TierBadge';
import { TalentPoolCandidate } from '@/hooks/useTalentPool';
import { formatDistanceToNow } from 'date-fns';

interface CandidateCardProps {
  candidate: TalentPoolCandidate;
  onClick?: () => void;
  onLogTouchpoint?: () => void;
  onAddToList?: () => void;
  onViewProfile?: () => void;
  className?: string;
}

export function CandidateCard({
  candidate,
  onClick,
  onLogTouchpoint,
  onAddToList,
  onViewProfile,
  className,
}: CandidateCardProps) {
  const initials = candidate.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const skills = Array.isArray(candidate.skills) ? candidate.skills : [];
  const displaySkills = skills.slice(0, 3);
  const remainingSkills = skills.length - 3;

  const lastContact = candidate.relationship?.last_meaningful_contact
    ? formatDistanceToNow(new Date(candidate.relationship.last_meaningful_contact), { addSuffix: true })
    : candidate.last_activity_at
    ? formatDistanceToNow(new Date(candidate.last_activity_at), { addSuffix: true })
    : 'No contact';

  return (
    <Card
      variant="interactive"
      className={cn('group', className)}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={candidate.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h4 className="font-semibold text-sm truncate">{candidate.full_name}</h4>
              <p className="text-xs text-muted-foreground truncate">
                {candidate.current_title || 'No title'}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewProfile?.(); }}>
                <Eye className="h-4 w-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onLogTouchpoint?.(); }}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Log Touchpoint
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddToList?.(); }}>
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
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open LinkedIn
                  </a>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground mb-3">
          {candidate.current_company && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{candidate.current_company}</span>
            </div>
          )}
          {candidate.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{candidate.location}</span>
            </div>
          )}
          {candidate.years_of_experience && (
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-3 w-3 flex-shrink-0" />
              <span>{candidate.years_of_experience} years experience</span>
            </div>
          )}
        </div>

        {/* Skills */}
        {displaySkills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {displaySkills.map((skill, i) => (
              <Badge key={i} variant="secondary" className="text-xs px-1.5 py-0">
                {skill}
              </Badge>
            ))}
            {remainingSkills > 0 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                +{remainingSkills}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <TierBadge tier={candidate.talent_tier} size="sm" />
          <div className="flex items-center gap-2">
            {candidate.move_probability !== null && (
              <MoveProbabilityBadge probability={candidate.move_probability} size="sm" />
            )}
          </div>
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          Last contact: {lastContact}
        </div>
      </CardContent>
    </Card>
  );
}
