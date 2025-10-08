import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ArrowRight, 
  X, 
  Calendar, 
  Clock,
  Mail,
  Phone,
  Linkedin,
  ExternalLink 
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
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No candidates in this stage yet</p>
      </div>
    );
  }

  const canAdvance = stageIndex < totalStages - 1;

  return (
    <div className="space-y-3">
      {candidates.map((candidate) => {
        const currentStage = candidate.stages[stageIndex];
        const timeInStage = currentStage?.started_at 
          ? formatDistanceToNow(new Date(currentStage.started_at), { addSuffix: true })
          : 'Just now';

        return (
          <Card 
            key={candidate.id} 
            className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => onViewDetails(candidate)}
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <Avatar className="h-12 w-12 ring-2 ring-border">
                <AvatarImage src={candidate.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {candidate.full_name?.split(' ').map(n => n[0]).join('') || 'C'}
                </AvatarFallback>
              </Avatar>

              {/* Candidate Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {candidate.full_name || 'Unknown Candidate'}
                    </h4>
                    {candidate.current_title && (
                      <p className="text-sm text-muted-foreground truncate">
                        {candidate.current_title}
                        {candidate.current_company && ` at ${candidate.current_company}`}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {timeInStage}
                  </Badge>
                </div>

                {/* Contact Info */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                  {candidate.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">{candidate.email}</span>
                    </div>
                  )}
                  {candidate.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{candidate.phone}</span>
                    </div>
                  )}
                  {candidate.linkedin_url && (
                    <a 
                      href={candidate.linkedin_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Linkedin className="w-3 h-3" />
                      <span>LinkedIn</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                {/* Stage Notes */}
                {currentStage?.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 bg-muted/50 p-2 rounded">
                    {currentStage.notes}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewDetails(candidate)}
                    className="text-xs"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Details
                  </Button>
                  {canAdvance && (
                    <Button
                      size="sm"
                      onClick={() => onAdvance(candidate)}
                      className="text-xs bg-success hover:bg-success/90"
                    >
                      <ArrowRight className="w-3 h-3 mr-1" />
                      Advance
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onReject(candidate)}
                    className="text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
