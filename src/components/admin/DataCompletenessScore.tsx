import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface DataCompletenessScoreProps {
  score: number;
  breakdown?: {
    basicInfo: number;
    experience: number;
    skills: number;
    compensation: number;
    resume: number;
    workPreferences: number;
    accountLinked: number;
  };
}

export function DataCompletenessScore({ score, breakdown }: DataCompletenessScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 50) return "secondary";
    return "destructive";
  };

  const sections = breakdown ? [
    { name: "Basic Info", score: breakdown.basicInfo, max: 15 },
    { name: "Experience", score: breakdown.experience, max: 10 },
    { name: "Skills", score: breakdown.skills, max: 10 },
    { name: "Compensation", score: breakdown.compensation, max: 20 },
    { name: "Resume", score: breakdown.resume, max: 15 },
    { name: "Work Preferences", score: breakdown.workPreferences, max: 10 },
    { name: "Account Linked", score: breakdown.accountLinked, max: 5 },
  ] : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Data Completeness</span>
          <Badge variant={getScoreVariant(score)} className="text-lg px-3 py-1">
            {score}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Progress value={score} className="h-3" />
          <p className="text-sm text-muted-foreground text-center">
            {score >= 80 ? "Excellent profile completeness" : 
             score >= 50 ? "Good, but could be improved" : 
             "Needs attention"}
          </p>
        </div>

        {breakdown && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium text-sm">Breakdown</h4>
            {sections.map((section) => (
              <div key={section.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {section.score === section.max ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : section.score > 0 ? (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm">{section.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {section.score}/{section.max}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
