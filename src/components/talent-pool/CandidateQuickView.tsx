import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mail,
  Phone,
  Linkedin,
  MapPin,
  Building2,
  Briefcase,
  ExternalLink,
  MessageSquare,
  ListPlus,
  Eye,
  TrendingUp,
  Heart,
  Reply,
  Brain,
  Calendar,
  FileText,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TierBadge, MoveProbabilityBadge } from './TierBadge';
import { TalentPoolCandidate } from '@/hooks/useTalentPool';
import { formatDistanceToNow } from 'date-fns';

interface CandidateQuickViewProps {
  candidate: TalentPoolCandidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewFullProfile?: () => void;
  onLogTouchpoint?: () => void;
  onAddToList?: () => void;
  onScheduleInterview?: () => void;
  onGenerateDossier?: () => void;
  onWhatsApp?: () => void;
}

export function CandidateQuickView({
  candidate,
  open,
  onOpenChange,
  onViewFullProfile,
  onLogTouchpoint,
  onAddToList,
  onScheduleInterview,
  onGenerateDossier,
  onWhatsApp,
}: CandidateQuickViewProps) {
  if (!candidate) return null;

  const initials = candidate.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const skills = Array.isArray(candidate.skills) ? candidate.skills : [];
  const displaySkills = skills.slice(0, 6);

  const lastContact = candidate.relationship?.last_meaningful_contact
    ? formatDistanceToNow(new Date(candidate.relationship.last_meaningful_contact), { addSuffix: true })
    : 'Never';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[450px] sm:max-w-[450px] p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            {/* Header */}
            <SheetHeader className="mb-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={candidate.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl mb-1">{candidate.full_name}</SheetTitle>
                  <p className="text-sm text-muted-foreground mb-2">
                    {candidate.current_title || 'No title'}
                  </p>
                  <TierBadge tier={candidate.talent_tier} />
                </div>
              </div>
            </SheetHeader>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Card className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-400" />
                  <p className="text-lg font-semibold">
                    {candidate.move_probability !== null ? `${candidate.move_probability}%` : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Move %</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <Heart className="h-4 w-4 mx-auto mb-1 text-red-400" />
                  <p className="text-lg font-semibold">
                    {candidate.relationship?.warmth_score !== null
                      ? `${candidate.relationship?.warmth_score || 0}`
                      : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Warmth</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <Reply className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                  <p className="text-lg font-semibold">
                    {candidate.relationship?.response_rate !== null
                      ? `${candidate.relationship?.response_rate || 0}%`
                      : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Response</p>
                </CardContent>
              </Card>
            </div>

            <Separator className="my-4" />

            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-medium">Contact</h4>
              {candidate.email && (
                <a
                  href={`mailto:${candidate.email}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {candidate.email}
                </a>
              )}
              {candidate.phone && (
                <a
                  href={`tel:${candidate.phone}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {candidate.phone}
                </a>
              )}
              {candidate.linkedin_url && (
                <a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn Profile
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Details */}
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-medium">Details</h4>
              {candidate.current_company && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  {candidate.current_company}
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {candidate.location}
                </div>
              )}
              {candidate.years_of_experience && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  {candidate.years_of_experience} years experience
                </div>
              )}
            </div>

            {/* AI Summary */}
            {candidate.ai_summary && (
              <>
                <Separator className="my-4" />
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-400" />
                    AI Summary
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {candidate.ai_summary}
                  </p>
                </div>
              </>
            )}

            {/* Skills */}
            {displaySkills.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-2">Top Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {displaySkills.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {skills.length > 6 && (
                      <Badge variant="outline" className="text-xs">
                        +{skills.length - 6} more
                      </Badge>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Last Contact */}
            <div className="mb-6 text-sm text-muted-foreground">
              <span className="font-medium">Last contact:</span> {lastContact}
            </div>

            <Separator className="my-4" />

            {/* Quick Actions */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {candidate.phone && (
                  <Button onClick={onWhatsApp} variant="outline" size="sm" className="justify-start">
                    <MessageCircle className="h-4 w-4 mr-2 text-green-500" />
                    WhatsApp
                  </Button>
                )}
                <Button onClick={onScheduleInterview} variant="outline" size="sm" className="justify-start">
                  <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                  Schedule
                </Button>
                <Button onClick={onGenerateDossier} variant="outline" size="sm" className="justify-start">
                  <FileText className="h-4 w-4 mr-2 text-purple-500" />
                  Dossier
                </Button>
                <Button onClick={onLogTouchpoint} variant="outline" size="sm" className="justify-start">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Touchpoint
                </Button>
              </div>
              <Button onClick={onAddToList} variant="outline" className="w-full justify-start">
                <ListPlus className="h-4 w-4 mr-2" />
                Add to List
              </Button>
              <Button onClick={onViewFullProfile} className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                View Full Profile
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
