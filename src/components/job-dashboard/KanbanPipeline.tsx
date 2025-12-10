import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ChevronRight, Plus, MoreHorizontal, User, Clock, 
  ArrowRight, XCircle, Eye
} from "lucide-react";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Stage {
  name: string;
  order: number;
  owner?: 'company' | 'quantum_club';
  format?: 'online' | 'in_person' | 'hybrid' | 'assessment';
}

interface Application {
  id: string;
  current_stage_index: number;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  current_title?: string;
  current_company?: string;
  user_id: string;
  candidate_id?: string;
  applied_at: string;
  updated_at?: string;
  match_score?: number;
}

interface KanbanPipelineProps {
  stages: Stage[];
  applications: Application[];
  avgDaysInStage: { [key: number]: number };
  jobId: string;
  onAdvanceCandidate: (candidate: Application) => void;
  onRejectCandidate: (candidate: Application) => void;
  onAddStage: () => void;
}

export const KanbanPipeline = memo(({
  stages,
  applications,
  avgDaysInStage,
  jobId,
  onAdvanceCandidate,
  onRejectCandidate,
  onAddStage
}: KanbanPipelineProps) => {
  const navigate = useNavigate();

  const getHealthColor = (avgDays: number) => {
    if (avgDays > 14) return "bg-red-500";
    if (avgDays > 7) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getStageApplications = (stageOrder: number) => 
    applications.filter(app => app.current_stage_index === stageOrder);

  const handleViewProfile = (candidate: Application) => {
    const candidateId = candidate.candidate_id || candidate.user_id;
    if (candidateId) {
      navigate(`/candidate/${candidateId}?fromJob=${jobId}`);
    }
  };

  return (
    <div className="relative">
      <ScrollArea className="w-full pb-4">
        <div className="flex gap-4 min-w-max px-1 py-1">
          {stages.sort((a, b) => a.order - b.order).map((stage) => {
            const stageApps = getStageApplications(stage.order);
            const avgDays = avgDaysInStage[stage.order] || 0;
            
            return (
              <div 
                key={`stage-${stage.order}`}
                className="w-72 flex-shrink-0 rounded-xl border border-border/40 bg-card/50"
              >
                {/* Stage Header */}
                <div className="px-4 py-3 border-b border-border/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        getHealthColor(avgDays)
                      )} />
                      <h3 className="font-medium text-sm text-foreground">
                        {stage.name}
                      </h3>
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-muted/50 border-0">
                        {stageApps.length}
                      </Badge>
                    </div>
                  </div>
                  {avgDays > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Avg {avgDays}d in stage
                    </p>
                  )}
                </div>

                {/* Candidates */}
                <div className="p-2 space-y-2 min-h-[200px] max-h-[400px] overflow-y-auto">
                  {stageApps.length === 0 ? (
                    <div className="flex items-center justify-center h-24 text-sm text-muted-foreground/60">
                      No candidates
                    </div>
                  ) : (
                    stageApps.map((app) => (
                      <CandidateCard
                        key={app.id}
                        candidate={app}
                        isLastStage={stage.order === stages.length - 1}
                        onAdvance={() => onAdvanceCandidate(app)}
                        onReject={() => onRejectCandidate(app)}
                        onView={() => handleViewProfile(app)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Stage Column */}
          <div className="w-72 flex-shrink-0">
            <Button
              variant="outline"
              className="w-full h-16 border-dashed border-border/40 hover:border-border/60 hover:bg-muted/20"
              onClick={onAddStage}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Stage
            </Button>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
});

KanbanPipeline.displayName = 'KanbanPipeline';

// Candidate Card Component
interface CandidateCardProps {
  candidate: Application;
  isLastStage: boolean;
  onAdvance: () => void;
  onReject: () => void;
  onView: () => void;
}

const CandidateCard = memo(({ 
  candidate, 
  isLastStage,
  onAdvance, 
  onReject,
  onView 
}: CandidateCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const initials = (candidate.full_name || 'C')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div 
      className={cn(
        "group relative rounded-lg border bg-background p-3 transition-all duration-150",
        "border-border/40 hover:border-border/60 hover:shadow-sm"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarImage src={candidate.avatar_url} />
          <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">
            {candidate.full_name || 'Candidate'}
          </p>
          {candidate.current_title && (
            <p className="text-xs text-muted-foreground truncate">
              {candidate.current_title}
            </p>
          )}
          {candidate.match_score && candidate.match_score > 0 && (
            <Badge 
              variant="secondary" 
              className="mt-1.5 h-5 text-[10px] bg-primary/10 text-primary border-0"
            >
              {candidate.match_score}% match
            </Badge>
          )}
        </div>

        {/* Quick Actions - Show on hover */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                isHovered && "opacity-100"
              )}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onView} className="gap-2">
              <Eye className="w-4 h-4" />
              View Profile
            </DropdownMenuItem>
            {!isLastStage && (
              <DropdownMenuItem onClick={onAdvance} className="gap-2">
                <ArrowRight className="w-4 h-4 text-emerald-600" />
                Advance
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onReject} className="gap-2 text-destructive">
              <XCircle className="w-4 h-4" />
              Reject
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

CandidateCard.displayName = 'CandidateCard';
