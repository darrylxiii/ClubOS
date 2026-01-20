import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, MessageSquare, Calendar, Clock, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface CandidateRelationship {
  warmth_score: number | null;
  relationship_strength: string | null;
  last_meaningful_contact: string | null;
  response_rate: number | null;
  preferred_contact_channel: string | null;
  next_action: string | null;
  next_action_date: string | null;
  follow_up_cadence_days: number | null;
  total_touchpoints: number | null;
}

interface RelationshipCardProps {
  relationship: CandidateRelationship | null;
  isLoading?: boolean;
  onEdit?: () => void;
  className?: string;
}

const strengthColors: Record<string, string> = {
  cold: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  warming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  warm: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  strong: 'bg-green-500/20 text-green-400 border-green-500/30',
  advocate: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const channelLabels: Record<string, string> = {
  email: 'Email',
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  in_person: 'In Person',
};

function getWarmthColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-orange-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-slate-400';
}

export function RelationshipCard({ relationship, isLoading, onEdit, className }: RelationshipCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const warmthScore = relationship?.warmth_score ?? 0;
  const strength = relationship?.relationship_strength || 'cold';
  const lastContact = relationship?.last_meaningful_contact
    ? formatDistanceToNow(new Date(relationship.last_meaningful_contact), { addSuffix: true })
    : 'Never';
  const responseRate = relationship?.response_rate ?? 0;
  const preferredChannel = relationship?.preferred_contact_channel || 'email';
  const nextAction = relationship?.next_action;
  const nextActionDate = relationship?.next_action_date;
  const totalTouchpoints = relationship?.total_touchpoints ?? 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-400" />
            Relationship
          </CardTitle>
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warmth Score */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Warmth Score</span>
          <div className="flex items-center gap-2">
            <span className={cn('text-2xl font-bold', getWarmthColor(warmthScore))}>
              {warmthScore}
            </span>
            <Badge
              variant="outline"
              className={cn('text-xs', strengthColors[strength])}
            >
              {strength.charAt(0).toUpperCase() + strength.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Response Rate</p>
            <p className="text-sm font-medium">{responseRate}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Touchpoints</p>
            <p className="text-sm font-medium">{totalTouchpoints}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Last Contact</p>
            <p className="text-sm font-medium">{lastContact}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Preferred Channel</p>
            <p className="text-sm font-medium">{channelLabels[preferredChannel] || preferredChannel}</p>
          </div>
        </div>

        {/* Next Action */}
        {nextAction && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-primary mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{nextAction}</p>
                {nextActionDate && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {format(new Date(nextActionDate), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
