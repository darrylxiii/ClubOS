import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, Clock, TrendingUp, MessageSquare, Calendar, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";

interface Application {
  id: string;
  candidate_id?: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
  current_title?: string;
  current_stage_index: number;
  updated_at?: string;
  applied_at: string;
  stages?: any[];
}

interface CandidatesAtRiskPanelProps {
  applications: Application[];
  stages: any[];
  avgDaysInStage: { [key: number]: number };
  jobId: string;
}

interface AtRiskCandidate extends Application {
  riskType: 'stale' | 'long_stage' | 'no_response' | 'high_competition';
  riskLevel: 'high' | 'medium' | 'low';
  daysInStage: number;
  riskReason: string;
}

export const CandidatesAtRiskPanel = memo(({
  applications,
  stages,
  avgDaysInStage,
  jobId
}: CandidatesAtRiskPanelProps) => {
  const navigate = useNavigate();

  const atRiskCandidates = useMemo(() => {
    const now = Date.now();
    const candidates: AtRiskCandidate[] = [];

    applications.forEach(app => {
      const lastUpdate = new Date(app.updated_at || app.applied_at).getTime();
      const daysInStage = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
      const avgDays = avgDaysInStage[app.current_stage_index] || 7;
      const stageName = stages[app.current_stage_index]?.name || 'Unknown';

      // High risk: 2x+ average time in stage
      if (daysInStage >= avgDays * 2 && daysInStage > 5) {
        candidates.push({
          ...app,
          riskType: 'long_stage',
          riskLevel: 'high',
          daysInStage,
          riskReason: `${daysInStage}d in ${stageName} (avg: ${avgDays}d)`
        });
      }
      // Medium risk: 1.5x average time
      else if (daysInStage >= avgDays * 1.5 && daysInStage > 3) {
        candidates.push({
          ...app,
          riskType: 'stale',
          riskLevel: 'medium',
          daysInStage,
          riskReason: `${daysInStage}d without activity`
        });
      }
      // Low risk: approaching average time
      else if (daysInStage >= avgDays && daysInStage > 2) {
        candidates.push({
          ...app,
          riskType: 'stale',
          riskLevel: 'low',
          daysInStage,
          riskReason: `${daysInStage}d in ${stageName}`
        });
      }
    });

    // Sort by risk level and days in stage
    return candidates
      .sort((a, b) => {
        const riskOrder = { high: 0, medium: 1, low: 2 };
        if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
          return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        }
        return b.daysInStage - a.daysInStage;
      })
      .slice(0, 5); // Show top 5 at-risk
  }, [applications, stages, avgDaysInStage]);

  if (atRiskCandidates.length === 0) {
    return null;
  }

  const getRiskBadgeStyles = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'low':
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getRiskIcon = (type: string) => {
    switch (type) {
      case 'long_stage':
        return <Clock className="w-3 h-3" />;
      case 'stale':
        return <AlertTriangle className="w-3 h-3" />;
      case 'high_competition':
        return <TrendingUp className="w-3 h-3" />;
      default:
        return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const highRiskCount = atRiskCandidates.filter(c => c.riskLevel === 'high').length;

  return (
    <Card className="border-2 border-destructive/20 bg-gradient-to-br from-destructive/5 to-card/90 backdrop-blur-xl shadow-[var(--shadow-glass-md)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-destructive/10">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <CardTitle className="text-base font-bold">Candidates at Risk</CardTitle>
          </div>
          {highRiskCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {highRiskCount} urgent
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <TooltipProvider>
          {atRiskCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 hover:bg-background/80 transition-all group cursor-pointer border border-transparent hover:border-border/50"
              onClick={() => {
                if (candidate.candidate_id) {
                  navigate(`/candidates/${candidate.candidate_id}`);
                }
              }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="h-8 w-8 border border-border/30">
                  <AvatarImage src={candidate.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-muted">
                    {(candidate.full_name || 'C').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{candidate.full_name}</p>
                  <div className="flex items-center gap-1.5">
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] px-1.5 py-0 h-4 gap-1 ${getRiskBadgeStyles(candidate.riskLevel)}`}
                    >
                      {getRiskIcon(candidate.riskType)}
                      {candidate.riskLevel}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {candidate.riskReason}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Open message dialog
                      }}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send message</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Open schedule dialog
                      }}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Schedule follow-up</TooltipContent>
                </Tooltip>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
});

CandidatesAtRiskPanel.displayName = 'CandidatesAtRiskPanel';
