import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertCircle, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AssessmentBreakdown } from "@/hooks/useAssessmentScores";
import { candidateProfileTokens, getScoreColor } from "@/config/candidate-profile-tokens";

interface CultureFitSignalsProps {
  candidateId: string;
  breakdown: AssessmentBreakdown | null;
}

interface FeedbackEntry {
  culture_fit_score: number | null;
  overall_rating: number | null;
  recommendation: string | null;
  concerns: string[] | null;
  submitted_at: string;
}

export function CultureFitSignals({ candidateId, breakdown }: CultureFitSignalsProps) {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);

  useEffect(() => {
    async function loadFeedback() {
      // Get feedback via applications
      const { data: apps } = await supabase
        .from('applications')
        .select('id')
        .eq('candidate_id', candidateId);

      if (!apps || apps.length === 0) return;

      const { data } = await supabase
        .from('interview_feedback')
        .select('culture_fit_score, overall_rating, recommendation, concerns, submitted_at')
        .in('application_id', apps.map(a => a.id))
        .order('submitted_at', { ascending: false })
        .limit(10);

      if (data) setFeedback(data as FeedbackEntry[]);
    }

    loadFeedback();
  }, [candidateId]);

  const cultureFitData = breakdown?.culture_fit;
  const hasData = cultureFitData && cultureFitData.confidence > 0.1;

  return (
    <Card className={candidateProfileTokens.glass.card}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          Culture Fit Signals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasData ? (
          <>
            <div className="flex items-center gap-3">
              <div
                className="text-3xl font-bold"
                style={{ color: getScoreColor(cultureFitData.score).bg }}
              >
                {cultureFitData.score}
              </div>
              <div className="text-xs text-muted-foreground">
                <p>{cultureFitData.details}</p>
                <p className="mt-0.5">Confidence: {Math.round(cultureFitData.confidence * 100)}%</p>
              </div>
            </div>

            {/* Interview feedback entries */}
            {feedback.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                {feedback.slice(0, 3).map((fb, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Star className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Interview {feedback.length - i}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {fb.culture_fit_score != null && (
                        <Badge variant="outline" className="text-xs">
                          {fb.culture_fit_score}/10
                        </Badge>
                      )}
                      {fb.recommendation && (
                        <Badge
                          variant={fb.recommendation === 'strong_hire' || fb.recommendation === 'hire'
                            ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {fb.recommendation.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Concerns */}
            {feedback.some(fb => fb.concerns && fb.concerns.length > 0) && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">Flagged Concerns</p>
                {feedback
                  .flatMap(fb => fb.concerns || [])
                  .slice(0, 3)
                  .map((concern, i) => (
                    <p key={i} className="text-xs text-destructive/80 flex items-start gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {concern}
                    </p>
                  ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No culture fit data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Culture fit scores are gathered from interview feedback
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
