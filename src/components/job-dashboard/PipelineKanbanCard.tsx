import { memo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowRight, X, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineKanbanCardProps {
  application: any;
  avgDaysThreshold: number;
  onAdvance: (app: any) => void;
  onReject: (app: any) => void;
  onViewProfile: (app: any) => void;
}

export const PipelineKanbanCard = memo(({
  application,
  avgDaysThreshold,
  onAdvance,
  onReject,
  onViewProfile,
}: PipelineKanbanCardProps) => {
  const [hovered, setHovered] = useState(false);
  const name = application.full_name || 'Candidate';
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const title = application.current_title || '';
  
  const appliedDate = new Date(application.updated_at || application.applied_at);
  const daysInStage = Math.floor((Date.now() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const riskLevel = daysInStage > avgDaysThreshold * 2 ? 'high' : daysInStage > avgDaysThreshold ? 'medium' : 'none';

  return (
    <div
      className={cn(
        "group relative p-3 rounded-lg cursor-pointer transition-all duration-200",
        "bg-card/50 backdrop-blur-sm border border-border/20",
        "hover:bg-card/70 hover:border-border/40 hover:shadow-glass-sm",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onViewProfile(application)}
    >
      <div className="flex items-start gap-2.5">
        <Avatar className="h-7 w-7 shrink-0">
          {application.avatar_url && <AvatarImage src={application.avatar_url} />}
          <AvatarFallback className="text-[10px] bg-muted/50">{initials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate leading-tight">{name}</p>
          {title && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{title}</p>
          )}
        </div>

        {/* Risk indicator */}
        {riskLevel !== 'none' && (
          <span className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0 mt-1.5",
            riskLevel === 'high' ? 'bg-destructive' : 'bg-warning'
          )} />
        )}
      </div>

      {/* Days in stage */}
      <div className="mt-1.5 flex items-center justify-between">
        <span className={cn(
          "text-[10px] tabular-nums",
          riskLevel === 'high' ? 'text-destructive' : riskLevel === 'medium' ? 'text-warning' : 'text-muted-foreground'
        )}>
          {daysInStage}d in stage
        </span>
        {application.match_score && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {application.match_score}% match
          </span>
        )}
      </div>

      {/* Hover actions */}
      {hovered && (
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 p-1.5 bg-card/90 backdrop-blur-md border-t border-border/30 rounded-b-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-success hover:text-success hover:bg-success/10"
            onClick={() => onAdvance(application)}
            title="Advance"
          >
            <ArrowRight className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onReject(application)}
            title="Reject"
          >
            <X className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => onViewProfile(application)}
            title="View Profile"
          >
            <Eye className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
});

PipelineKanbanCard.displayName = 'PipelineKanbanCard';
