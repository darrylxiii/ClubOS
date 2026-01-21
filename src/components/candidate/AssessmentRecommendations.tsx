import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Lightbulb, 
  Target, 
  CheckCircle2, 
  Compass, 
  ArrowRight,
  Sparkles,
  RefreshCw 
} from "lucide-react";

interface AssessmentRecommendationsProps {
  assessmentType: 'personality' | 'skills' | 'culture' | 'technical';
  assessmentName: string;
  resultsData: Record<string, any>;
  score?: number;
}

interface ActionItem {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface AssessmentInsights {
  strengths: string[];
  developmentAreas: string[];
  actionItems: ActionItem[];
  careerRecommendations: string[];
  nextSteps: string;
}

export function AssessmentRecommendations({
  assessmentType,
  assessmentName,
  resultsData,
  score,
}: AssessmentRecommendationsProps) {
  const [isRefetching, setIsRefetching] = useState(false);

  const { data: insights, isLoading, error, refetch } = useQuery({
    queryKey: ['assessment-insights', assessmentType, JSON.stringify(resultsData)],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-assessment-insights', {
        body: {
          assessmentType,
          assessmentName,
          resultsData,
          score,
        },
      });

      if (error) throw error;
      return data as AssessmentInsights;
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    retry: 1,
  });

  const handleRefresh = async () => {
    setIsRefetching(true);
    await refetch();
    setIsRefetching(false);
  };

  const priorityColors: Record<string, string> = {
    high: 'bg-destructive/10 text-destructive border-destructive/20',
    medium: 'bg-warning/10 text-warning border-warning/20',
    low: 'bg-muted text-muted-foreground border-border',
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <span className="text-sm text-muted-foreground">QUIN is analyzing your results...</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/50">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Unable to generate AI insights at this time. Please try again later.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with QUIN branding */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">Powered by QUIN</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Strengths */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="w-4 h-4 text-primary" />
              Key Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Development Areas */}
        <Card className="border-warning/20 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-warning" />
              Growth Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.developmentAreas.map((area, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="w-4 h-4" />
            Recommended Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.actionItems.map((item, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                <Badge 
                  variant="outline" 
                  className={`shrink-0 capitalize ${priorityColors[item.priority]}`}
                >
                  {item.priority}
                </Badge>
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Career Recommendations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="w-4 h-4" />
            Career Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 mb-4">
            {insights.careerRecommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-primary">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm font-medium mb-1">Next Steps</p>
            <p className="text-sm text-muted-foreground">{insights.nextSteps}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}