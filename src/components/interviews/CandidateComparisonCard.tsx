import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { getInitials } from "@/lib/format";

interface CandidateData {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  scores: {
    technical: number;
    communication: number;
    problemSolving: number;
    cultureFit: number;
    leadership: number;
    experience: number;
  };
  overallScore: number;
  strengths: string[];
  concerns: string[];
  interviewDate: string;
}

interface CandidateComparisonCardProps {
  candidate: CandidateData;
}

export function CandidateComparisonCard({ candidate }: CandidateComparisonCardProps) {
  const scoreCategories = [
    { label: "Technical", value: candidate.scores.technical },
    { label: "Communication", value: candidate.scores.communication },
    { label: "Problem Solving", value: candidate.scores.problemSolving },
    { label: "Culture Fit", value: candidate.scores.cultureFit },
    { label: "Leadership", value: candidate.scores.leadership },
    { label: "Experience", value: candidate.scores.experience },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={candidate.avatar_url} />
            <AvatarFallback>{getInitials(candidate.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{candidate.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{candidate.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-muted-foreground">Overall Score</span>
          <span className={`text-2xl font-bold ${getScoreColor(candidate.overallScore)}`}>
            {candidate.overallScore}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {scoreCategories.map((cat) => (
            <div key={cat.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{cat.label}</span>
                <span className={getScoreColor(cat.value)}>{cat.value}%</span>
              </div>
              <Progress value={cat.value} className="h-1.5" />
            </div>
          ))}
        </div>

        {candidate.strengths.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-medium text-green-600">
              <TrendingUp className="h-4 w-4" />
              Strengths
            </div>
            <div className="flex flex-wrap gap-1">
              {candidate.strengths.slice(0, 3).map((s, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {candidate.concerns.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-medium text-amber-600">
              <AlertCircle className="h-4 w-4" />
              Areas of Concern
            </div>
            <div className="flex flex-wrap gap-1">
              {candidate.concerns.slice(0, 2).map((c, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
