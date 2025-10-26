import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, MapPin, Clock, Bookmark, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "./StatusBadge";
import { MatchScoreDialog } from "./MatchScoreDialog";

interface JobCardProps {
  id?: string;
  title: string;
  company: string;
  companyLogo?: string;
  companySlug?: string;
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
  id,
  title,
  company,
  companyLogo,
  companySlug,
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
  const navigate = useNavigate();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleCardClick = () => {
    if (id) navigate(`/jobs/${id}`);
  };

  const handleButtonClick = (e: React.MouseEvent, callback?: () => void) => {
    e.stopPropagation();
    callback?.();
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-foreground";
    if (score >= 70) return "text-foreground";
    return "text-muted-foreground";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return "bg-muted/20";
    if (score >= 70) return "bg-muted/20";
    return "bg-muted/10";
  };
  return (
    <Card 
      className="group relative overflow-hidden border-0 bg-card/20 backdrop-blur-xl hover:bg-card/25 transition-all duration-300 cursor-pointer" 
      onClick={handleCardClick}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            {companyLogo ? (
              <img 
                src={companyLogo} 
                alt={`${company} logo`}
                className="w-14 h-14 rounded-xl object-cover border border-border/20"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-muted/10 flex items-center justify-center border border-border/20">
                <Building2 className="w-7 h-7 text-muted-foreground/60" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl font-bold mb-1 tracking-tight">{title}</CardTitle>
              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground/80">
                <span className="font-medium">{company}</span>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{location}</span>
                </div>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="shrink-0 hover:bg-accent/10"
            onClick={(e) => handleButtonClick(e, onToggleSave)}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-foreground text-foreground" : "text-muted-foreground"}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Tags & Salary Section */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge 
              key={tag} 
              variant="secondary" 
              className="text-xs font-medium bg-background/40 backdrop-blur-sm border-0 px-3 py-1"
            >
              {tag}
            </Badge>
          ))}
          {salary && (
            <Badge 
              variant="outline" 
              className="text-xs font-semibold bg-muted/10 backdrop-blur-sm border border-border/20 px-3 py-1"
            >
              {salary}
            </Badge>
          )}
        </div>

        {/* Match Score Section */}
        {matchScore !== undefined && (
          <>
            <div 
              className="p-4 rounded-xl bg-background/30 backdrop-blur-sm border border-border/10 cursor-pointer hover:bg-background/40 transition-all duration-300"
              onClick={() => setShowBreakdown(true)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Match Score</span>
                <span className={`text-2xl font-bold tracking-tight ${getScoreColor(matchScore)}`}>
                  {matchScore}%
                </span>
              </div>
              <Progress value={matchScore} className="h-1.5 bg-background/50" />
              {matchScore >= 90 && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-foreground font-medium">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Elite Match - Auto-apply eligible</span>
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground/60">Tap for detailed breakdown</p>
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
        
        {/* Footer with Actions */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-medium">{postedDate}</span>
            </div>
            <span className="text-muted-foreground/40">•</span>
            <Badge variant="outline" className="text-xs border-0 bg-background/30 px-2 py-0.5">
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
                    onClick={(e) => handleButtonClick(e, onClubSync)}
                    size="sm" 
                    className="bg-muted/20 text-foreground border border-border/30 hover:bg-muted/30 hover:border-border/50 font-semibold backdrop-blur-sm"
                  >
                    <Zap className="w-3.5 h-3.5 mr-1.5" />
                    Club Sync
                  </Button>
                ) : (
                  <Button 
                    onClick={(e) => handleButtonClick(e, onApply)}
                    size="sm" 
                    className="bg-muted/20 text-foreground border border-border/30 hover:bg-muted/30 hover:border-border/50 font-semibold backdrop-blur-sm"
                  >
                    Apply Now
                  </Button>
                )}
                {onRefer && (
                  <Button 
                    onClick={(e) => handleButtonClick(e, onRefer)}
                    size="sm" 
                    variant="outline"
                    className="bg-background/20 border-border/20 hover:bg-background/30 hover:border-border/30 backdrop-blur-sm"
                  >
                    Refer
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
