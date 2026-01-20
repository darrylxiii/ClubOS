import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, Target, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface MLInsightsWidgetProps {
  jobId: string;
}

export function MLInsightsWidget({ jobId }: MLInsightsWidgetProps) {
  const navigate = useNavigate();
  const [mlMetrics, setMlMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMLMetrics() {
      try {
        // Fetch recent ML predictions for this job
        const { data: predictions } = await supabase
          .from('ml_predictions')
          .select('prediction_score, interview_probability, created_at')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (predictions && predictions.length > 0) {
          const avgMatchScore = predictions.reduce((sum, p) => sum + p.prediction_score, 0) / predictions.length;
          const avgInterviewProb = predictions.reduce((sum, p) => sum + (p.interview_probability || 0), 0) / predictions.length;
          
          setMlMetrics({
            avgMatchScore: (avgMatchScore * 100).toFixed(1),
            avgInterviewProb: (avgInterviewProb * 100).toFixed(1),
            totalPredictions: predictions.length,
            recentActivity: predictions.length > 0,
          });
        }
      } catch (error) {
        console.error('Error fetching ML metrics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMLMetrics();
  }, [jobId]);

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardContent className="pt-6 flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!mlMetrics || !mlMetrics.recentActivity) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4" />
            ML Matching Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            No ML predictions yet for this role
          </p>
          <Button 
            onClick={() => navigate(`/ml-dashboard?jobId=${jobId}`)} 
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            <Brain className="h-4 w-4 mr-2" />
            View ML Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="h-4 w-4" />
          ML Matching Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Avg Match</p>
            <p className="text-xl font-bold">{mlMetrics.avgMatchScore}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Interview Prob</p>
            <p className="text-xl font-bold">{mlMetrics.avgInterviewProb}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Predictions</p>
            <p className="text-xl font-bold">{mlMetrics.totalPredictions}</p>
          </div>
        </div>
        <Button 
          onClick={() => navigate(`/ml-dashboard?jobId=${jobId}`)} 
          variant="outline" 
          size="sm" 
          className="w-full"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          View Full ML Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}
