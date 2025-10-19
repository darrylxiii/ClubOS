import { useState } from "react";
import { Building2, MapPin, Clock, Bookmark, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "./StatusBadge";
import { MatchScoreDialog } from "./MatchScoreDialog";

interface JobCardProps {
  title: string;
  company: string;
  location: string;
  type: string;
  postedDate: string;
  status?: "applied" | "screening" | "interview" | "offer" | "rejected";
  tags: string[];
  salary?: string;
  matchScore?: number;
  isSaved?: boolean;
  onApply?: () => void;
  onRefer?: () => void;
  onClubSync?: () => void;
  onToggleSave?: () => void;
}

export const JobCard = ({
  title,
  company,
  location,
  type,
  postedDate,
  status,
  tags,
  salary,
  matchScore,
  isSaved = false,
  onApply,
  onRefer,
  onClubSync,
  onToggleSave,
}: JobCardProps) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-accent";
    if (score >= 70) return "text-primary";
    return "text-muted-foreground";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return "bg-accent/10";
    if (score >= 70) return "bg-primary/10";
    return "bg-muted";
  };
  return (
    <Card className="group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh opacity-50 transition-opacity group-hover:opacity-70" />
      <div className="relative">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{title}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                <span>{company}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{location}</span>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="shrink-0"
            onClick={onToggleSave}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-accent text-accent" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs bg-card/30 backdrop-blur-[var(--blur-glass-subtle)] border border-border/30">
              {tag}
            </Badge>
          ))}
          {salary && (
            <Badge variant="outline" className="text-xs font-semibold bg-card/20 backdrop-blur-[var(--blur-glass-subtle)] border-border/30">
              {salary}
            </Badge>
          )}
        </div>

        {matchScore !== undefined && (
          <>
            <div 
              className="mb-4 p-4 rounded-lg bg-card/20 backdrop-blur-[var(--blur-glass-subtle)] border border-border/30 cursor-pointer hover:border-border/50 hover:bg-card/30 transition-all"
              onClick={() => setShowBreakdown(true)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Match Score</span>
                <span className={`text-lg font-bold ${getScoreColor(matchScore)}`}>
                  {matchScore}%
                </span>
              </div>
              <Progress value={matchScore} className="h-2" />
              {matchScore >= 90 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-accent">
                  <Zap className="w-3 h-3" />
                  <span className="font-medium">Elite Match - Auto-apply eligible</span>
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Click to see detailed breakdown</p>
            </div>

            <MatchScoreDialog
              open={showBreakdown}
              onOpenChange={setShowBreakdown}
              jobId={`${company}-${title}`}
              jobTitle={title}
              company={company}
              tags={tags}
              matchScore={matchScore}
            />
          </>
        )}
        
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{postedDate}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {type}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {status ? (
              <StatusBadge status={status} />
            ) : (
              <>
                {matchScore !== undefined && matchScore > 90 && onClubSync ? (
                  <Button 
                    onClick={onClubSync} 
                    size="sm" 
                    variant="glass"
                    className="font-semibold border-accent/40 hover:border-accent/60"
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Club Sync
                  </Button>
                ) : (
                  <Button onClick={onApply} size="sm" variant="glass" className="font-semibold">
                    Apply Now
                  </Button>
                )}
                {onRefer && (
                  <Button onClick={onRefer} size="sm" variant="outline">
                    Refer a Friend
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
      </div>
    </Card>
  );
};
