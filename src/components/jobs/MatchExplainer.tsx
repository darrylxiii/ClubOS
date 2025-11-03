import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";

interface MatchExplainerProps {
  score: number;
  factors?: {
    skillOverlap: number;
    experienceMatch: number;
    salaryAlignment: number;
    cultureFit: number;
    assessmentFit: number;
  };
  explanation?: string;
}

export function MatchExplainer({ score, factors, explanation }: MatchExplainerProps) {
  return (
    <Card className="border-l-4 border-l-primary bg-card/40 backdrop-blur-sm">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={score >= 85 ? "default" : "secondary"} className="text-xs">
            {score}% Match
          </Badge>
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">AI-Powered Match</span>
        </div>
        
        <div className="space-y-2 text-sm">
          <h4 className="font-semibold">Why you're a great fit:</h4>
          <ul className="space-y-1">
            {factors && factors.skillOverlap > 75 && (
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Strong skills overlap ({factors.skillOverlap}%)</span>
              </li>
            )}
            {factors && factors.cultureFit > 80 && (
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Excellent culture alignment</span>
              </li>
            )}
            {factors && factors.experienceMatch > 85 && (
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Experience level matches requirements</span>
              </li>
            )}
            {factors && factors.assessmentFit > 70 && (
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Assessment results align well</span>
              </li>
            )}
          </ul>
          
          {explanation && (
            <p className="text-muted-foreground text-xs mt-2 italic">
              {explanation}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
