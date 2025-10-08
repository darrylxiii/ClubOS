import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowRight, 
  X, 
  Clock,
  Mail,
  Phone,
  Linkedin,
  ExternalLink,
  Users
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Candidate {
  id: string;
  user_id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  current_title?: string;
  current_company?: string;
  linkedin_url?: string;
  applied_at: string;
  current_stage_index: number;
  stages: any[];
}

interface StageCandidatesListProps {
  candidates: Candidate[];
  stageIndex: number;
  stageName: string;
  totalStages: number;
  onAdvance: (candidate: Candidate) => void;
  onReject: (candidate: Candidate) => void;
  onViewDetails: (candidate: Candidate) => void;
}

export function StageCandidatesList({
  candidates,
  stageIndex,
  stageName,
  totalStages,
  onAdvance,
  onReject,
  onViewDetails,
}: StageCandidatesListProps) {
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No candidates in this stage</p>
        <p className="text-xs text-muted-foreground mt-1">Candidates will appear here when they reach this stage</p>
      </div>
    );
  }

  const canAdvance = stageIndex < totalStages - 1;

  return (
    <div className="space-y-3">
      {candidates.map((candidate) => {
        const currentStage = candidate.stages?.[stageIndex];
        const timeInStage = currentStage?.started_at 
          ? formatDistanceToNow(new Date(currentStage.started_at), { addSuffix: true })
          : formatDistanceToNow(new Date(candidate.applied_at), { addSuffix: true });

        const initials = candidate.full_name
          ?.split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || '?';

        return (
          <Card 
            key={candidate.id} 
            className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <CardContent className="p-4 relative">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative">
                  <Avatar className="h-14 w-14 ring-2 ring-border group-hover:ring-primary transition-all">
                    <AvatarImage src={candidate.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-background" />
                </div>

                {/* Candidate Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">
                        {candidate.full_name || 'Candidate'}
                      </h4>
                      {candidate.current_title && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {candidate.current_title}
                          {candidate.current_company && (
                            <span className="text-muted-foreground/70"> • {candidate.current_company}</span>
                          )}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs font-medium">
                      <Clock className="w-3 h-3 mr-1" />
                      {timeInStage}
                    </Badge>
                  </div>

                  {/* Contact Info */}
                  <div className="flex flex-wrap gap-4 mb-3">
                    {candidate.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[180px]">{candidate.email}</span>
                      </div>
                    )}
                    {candidate.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{candidate.phone}</span>
                      </div>
                    )}
                    {candidate.linkedin_url && (
                      <a 
                        href={candidate.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                        <span>LinkedIn</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Stage Notes */}
                  {currentStage?.notes && (
                    <div className="mb-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {currentStage.notes}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(candidate);
                      }}
                      className="text-xs font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      View Profile
                    </Button>
                    {canAdvance && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAdvance(candidate);
                        }}
                        className="text-xs font-medium bg-gradient-to-r from-success to-success/90 hover:from-success/90 hover:to-success/80"
                      >
                        <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                        Advance to Next
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReject(candidate);
                      }}
                      className="text-xs font-medium"
                    >
                      <X className="w-3.5 h-3.5 mr-1.5" />
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
