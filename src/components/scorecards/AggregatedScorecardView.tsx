import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Users, TrendingUp, AlertTriangle, CheckCircle, XCircle, Minus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AggregatedScorecardViewProps {
  applicationId: string;
}

interface AggregatedScores {
  totalEvaluators: number;
  avgOverall: number;
  avgTechnical: number;
  avgCultural: number;
  avgCommunication: number;
  recommendations: Record<string, number>;
  consensusRecommendation: string;
  consensusStrength: number;
  keyStrengths: string[];
  keyConcerns: string[];
}

const recommendationConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  strong_yes: { color: "bg-green-500", icon: <CheckCircle className="h-4 w-4" /> },
  yes: { color: "bg-green-400", icon: <CheckCircle className="h-4 w-4" /> },
  neutral: { color: "bg-yellow-500", icon: <Minus className="h-4 w-4" /> },
  no: { color: "bg-red-400", icon: <XCircle className="h-4 w-4" /> },
  strong_no: { color: "bg-red-500", icon: <XCircle className="h-4 w-4" /> },
};

export function AggregatedScorecardView({ applicationId }: AggregatedScorecardViewProps) {
  const { data: aggregated, isLoading } = useQuery({
    queryKey: ["aggregated-scorecards", applicationId],
    queryFn: async (): Promise<AggregatedScores | null> => {
      const { data: scorecards, error } = await supabase
        .from("candidate_scorecards")
        .select("*")
        .eq("application_id", applicationId);

      if (error || !scorecards?.length) return null;

      // Calculate aggregates
      const recommendations: Record<string, number> = {};
      let totalOverall = 0;
      let totalTechnical = 0;
      let totalCultural = 0;
      let totalCommunication = 0;
      const allStrengths: string[] = [];
      const allConcerns: string[] = [];

      scorecards.forEach((sc) => {
        totalOverall += sc.overall_rating || 0;
        totalTechnical += sc.technical_score || 0;
        totalCultural += sc.cultural_fit_score || 0;
        totalCommunication += sc.communication_score || 0;
        
        const rec = sc.recommendation || "neutral";
        recommendations[rec] = (recommendations[rec] || 0) + 1;
        
        if (sc.strengths) allStrengths.push(sc.strengths);
        if (sc.concerns) allConcerns.push(sc.concerns);
      });

      const n = scorecards.length;
      
      // Find consensus recommendation
      let maxCount = 0;
      let consensusRec = "neutral";
      Object.entries(recommendations).forEach(([rec, count]) => {
        if (count > maxCount) {
          maxCount = count;
          consensusRec = rec;
        }
      });

      return {
        totalEvaluators: n,
        avgOverall: Math.round((totalOverall / n) * 10) / 10,
        avgTechnical: Math.round((totalTechnical / n) * 10) / 10,
        avgCultural: Math.round((totalCultural / n) * 10) / 10,
        avgCommunication: Math.round((totalCommunication / n) * 10) / 10,
        recommendations,
        consensusRecommendation: consensusRec,
        consensusStrength: Math.round((maxCount / n) * 100),
        keyStrengths: allStrengths.slice(0, 3),
        keyConcerns: allConcerns.slice(0, 3),
      };
    },
    enabled: !!applicationId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">Loading aggregated scores...</p>
        </CardContent>
      </Card>
    );
  }

  if (!aggregated) {
    return null;
  }

  const consensusConfig = recommendationConfig[aggregated.consensusRecommendation] || recommendationConfig.neutral;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Panel Consensus
            </CardTitle>
            <CardDescription>
              {aggregated.totalEvaluators} evaluator{aggregated.totalEvaluators !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <Badge 
            className={`${consensusConfig.color} text-white gap-1`}
          >
            {consensusConfig.icon}
            {aggregated.consensusRecommendation.replace("_", " ")}
            <span className="ml-1 opacity-75">({aggregated.consensusStrength}%)</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Bars */}
        <div className="grid grid-cols-2 gap-4">
          <ScoreBar label="Overall" value={aggregated.avgOverall} max={5} />
          <ScoreBar label="Technical" value={aggregated.avgTechnical} max={5} />
          <ScoreBar label="Cultural Fit" value={aggregated.avgCultural} max={5} />
          <ScoreBar label="Communication" value={aggregated.avgCommunication} max={5} />
        </div>

        {/* Recommendation Distribution */}
        <div>
          <p className="text-sm font-medium mb-2">Recommendation Distribution</p>
          <div className="flex gap-1 h-4 rounded-full overflow-hidden">
            {Object.entries(aggregated.recommendations).map(([rec, count]) => {
              const width = (count / aggregated.totalEvaluators) * 100;
              const config = recommendationConfig[rec] || recommendationConfig.neutral;
              return (
                <div
                  key={rec}
                  className={`${config.color} transition-all`}
                  style={{ width: `${width}%` }}
                  title={`${rec.replace("_", " ")}: ${count}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>Strong No</span>
            <span>Strong Yes</span>
          </div>
        </div>

        <Separator />

        {/* Key Insights */}
        <div className="grid grid-cols-2 gap-4">
          {aggregated.keyStrengths.length > 0 && (
            <div>
              <p className="text-sm font-medium flex items-center gap-1 text-green-600 mb-2">
                <TrendingUp className="h-4 w-4" />
                Key Strengths
              </p>
              <ul className="space-y-1">
                {aggregated.keyStrengths.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground line-clamp-2">
                    • {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {aggregated.keyConcerns.length > 0 && (
            <div>
              <p className="text-sm font-medium flex items-center gap-1 text-amber-600 mb-2">
                <AlertTriangle className="h-4 w-4" />
                Key Concerns
              </p>
              <ul className="space-y-1">
                {aggregated.keyConcerns.map((c, i) => (
                  <li key={i} className="text-xs text-muted-foreground line-clamp-2">
                    • {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percentage = (value / max) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/{max}</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
