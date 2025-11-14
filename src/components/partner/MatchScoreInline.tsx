import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Check, Info } from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { MatchScoreDialog } from "@/components/MatchScoreDialog";

interface MatchScoreInlineProps {
  matchScore: number;
  jobId?: string;
  jobTitle?: string;
  company?: string;
  tags?: string[];
  skillsOverlap?: number;
  experienceMatch?: number;
  salaryFit?: number;
  locationFit?: number;
  topFactors?: string[];
}

export function MatchScoreInline({
  matchScore,
  jobId,
  jobTitle,
  company,
  tags = [],
  skillsOverlap = 0,
  experienceMatch = 0,
  salaryFit = 0,
  locationFit = 0,
  topFactors = []
}: MatchScoreInlineProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <>
      <TooltipProvider>
        <div className="space-y-2">
          {/* Match Score Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 px-2">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className={getMatchColor(matchScore)}>
                  {matchScore}% Match
                </span>
              </Badge>
              {jobId && jobTitle && company && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBreakdown(true)}
                  className="h-6 px-2 text-xs"
                >
                  <Info className="w-3 h-3 mr-1" />
                  Details
                </Button>
              )}
            </div>
          </div>

          {/* Quick Match Factors */}
          {(skillsOverlap > 0 || experienceMatch > 0 || salaryFit > 0 || locationFit > 0) && (
            <div className="space-y-1.5">
              {skillsOverlap >= 75 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-xs">
                      <Check className="w-3 h-3 text-green-600" />
                      <span className="text-muted-foreground">Skills: {skillsOverlap}% overlap</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Strong skills alignment with role requirements</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {experienceMatch >= 75 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-xs">
                      <Check className="w-3 h-3 text-green-600" />
                      <span className="text-muted-foreground">Experience match: {experienceMatch}%</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Experience level aligns well with role requirements</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {salaryFit >= 80 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-xs">
                      <Check className="w-3 h-3 text-green-600" />
                      <span className="text-muted-foreground">Salary compatible</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Candidate expectations align with budget</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {locationFit >= 90 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-xs">
                      <Check className="w-3 h-3 text-green-600" />
                      <span className="text-muted-foreground">Location fit</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Location or remote work preferences align</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Top Match Factors */}
          {topFactors.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Top Match Factors:</p>
              <div className="space-y-1">
                {topFactors.slice(0, 3).map((factor, index) => (
                  <p key={index} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-primary font-bold">•</span>
                    <span>{factor}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </TooltipProvider>

      {/* Full Breakdown Dialog */}
      {jobId && jobTitle && company && (
        <MatchScoreDialog
          open={showBreakdown}
          onOpenChange={setShowBreakdown}
          jobId={jobId}
          jobTitle={jobTitle}
          company={company}
          tags={tags}
          matchScore={matchScore}
        />
      )}
    </>
  );
}
