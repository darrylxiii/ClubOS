import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, MessageSquare, Calendar, MapPin, Briefcase, Star } from "lucide-react";

interface CandidateQuickPreviewProps {
  candidate: {
    full_name: string;
    avatar_url?: string;
    current_title?: string;
    current_company?: string;
    location?: string;
    match_score?: number;
    skills?: string[];
    experience_years?: number;
    last_activity?: string;
  };
  onViewProfile: () => void;
  onSendMessage?: () => void;
  onSchedule?: () => void;
  position?: { x: number; y: number };
}

export function CandidateQuickPreview({
  candidate,
  onViewProfile,
  onSendMessage,
  onSchedule,
  position = { x: 0, y: 0 }
}: CandidateQuickPreviewProps) {
  return (
    <div
      className="fixed z-50 animate-scale-in"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
        marginTop: '-8px'
      }}
    >
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card/95 to-card/90 backdrop-blur-xl shadow-2xl w-80">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12 border-2 border-primary/20">
              <AvatarImage src={candidate.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {candidate.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base truncate">{candidate.full_name}</h3>
              {candidate.current_title && (
                <p className="text-sm text-muted-foreground truncate">{candidate.current_title}</p>
              )}
              {candidate.current_company && (
                <p className="text-xs text-muted-foreground/60 truncate">{candidate.current_company}</p>
              )}
            </div>
            {candidate.match_score && (
              <Badge 
                variant="secondary" 
                className="bg-primary/10 text-primary border-primary/20 font-bold"
              >
                <Star className="w-3 h-3 mr-1 fill-current" />
                {candidate.match_score}%
              </Badge>
            )}
          </div>

          {/* Quick Info */}
          <div className="space-y-2 text-sm">
            {candidate.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{candidate.location}</span>
              </div>
            )}
            {candidate.experience_years && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="w-4 h-4 flex-shrink-0" />
                <span>{candidate.experience_years} years experience</span>
              </div>
            )}
          </div>

          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Top Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.slice(0, 5).map((skill, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className="text-xs bg-background/60 border-0"
                  >
                    {skill}
                  </Badge>
                ))}
                {candidate.skills.length > 5 && (
                  <Badge variant="secondary" className="text-xs bg-background/60 border-0">
                    +{candidate.skills.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Last Activity */}
          {candidate.last_activity && (
            <p className="text-xs text-muted-foreground">
              Last active: {candidate.last_activity}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-border/20">
            <Button
              size="sm"
              onClick={onViewProfile}
              className="flex-1 gap-2 bg-primary hover:bg-primary/90"
            >
              <Eye className="w-4 h-4" />
              View Profile
            </Button>
            {onSendMessage && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSendMessage}
                className="border-border/30 hover:border-border/50 bg-background/30 hover:bg-background/40"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            )}
            {onSchedule && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSchedule}
                className="border-border/30 hover:border-border/50 bg-background/30 hover:bg-background/40"
              >
                <Calendar className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
