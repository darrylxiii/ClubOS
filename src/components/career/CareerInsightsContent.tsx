import { useState, useEffect } from "react";
import { Brain, Sparkles, TrendingUp, Target, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface SkillGap {
  skill: string;
  current: number;
  required: number;
  priority: 'high' | 'medium' | 'low';
}

interface CareerInsights {
  skillGapAnalysis: SkillGap[];
  marketPosition: {
    percentile: number;
    salaryRange: { min: number; max: number };
    demandLevel: string;
  };
  careerTrends: string[];
  nextActions: string[];
}

export default function CareerInsightsContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState<CareerInsights | null>(null);

  useEffect(() => {
    if (user) loadInsights();
  }, [user]);

  const loadInsights = async () => {
    try {
      const { data } = await (supabase as any)
        .from('career_insights_cache')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (data && new Date(data.expires_at) > new Date()) {
        setInsights({
          skillGapAnalysis: data.skill_gap_analysis || [],
          marketPosition: data.market_position || { percentile: 0, salaryRange: { min: 0, max: 0 }, demandLevel: 'unknown' },
          careerTrends: data.career_trends || [],
          nextActions: data.next_actions || [],
        });
      }
    } catch (error) {
      logger.error('Error loading insights', error as Error, { componentName: 'CareerInsightsContent' });
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-career-insights', {
        body: { userId: user?.id }
      });

      if (error) throw error;

      if (data) {
        setInsights({
          skillGapAnalysis: data.skill_gap_analysis || [],
          marketPosition: data.market_position || { percentile: 0, salaryRange: { min: 0, max: 0 }, demandLevel: 'unknown' },
          careerTrends: data.career_trends || [],
          nextActions: data.next_actions || [],
        });
        toast.success('Career insights generated');
      }
    } catch (error) {
      logger.error('Error generating insights', error as Error, { componentName: 'CareerInsightsContent' });
      toast.error('Failed to generate career insights');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <Card className="text-center py-12">
        <CardContent className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Generate Your Career Insights</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Let QUIN analyze your profile, skills, and market data to provide personalized career recommendations.
            </p>
          </div>
          <Button onClick={generateInsights} disabled={generating} size="lg" className="gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Insights
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Position */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Your Market Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{insights.marketPosition.percentile}%</div>
              <p className="text-sm text-muted-foreground">Percentile Ranking</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                €{insights.marketPosition.salaryRange.min.toLocaleString()} - €{insights.marketPosition.salaryRange.max.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Market Salary Range</p>
            </div>
            <div className="text-center">
              <Badge variant={insights.marketPosition.demandLevel === 'high' ? 'default' : 'secondary'}>
                {insights.marketPosition.demandLevel} demand
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">Market Demand</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Skill Gap Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Skill Gap Analysis
            </CardTitle>
            <CardDescription>Areas for growth based on your target roles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.skillGapAnalysis.length > 0 ? (
              insights.skillGapAnalysis.slice(0, 5).map((skill, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{skill.skill}</span>
                    <Badge variant={skill.priority === 'high' ? 'destructive' : skill.priority === 'medium' ? 'default' : 'secondary'}>
                      {skill.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={(skill.current / skill.required) * 100} className="flex-1" />
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {skill.current}/{skill.required}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No skill gaps identified yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Next Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Recommended Next Steps
            </CardTitle>
            <CardDescription>Powered by QUIN</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {insights.nextActions.length > 0 ? (
                insights.nextActions.map((action, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-sm">{action}</span>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground text-sm">No recommendations available yet.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Regenerate Button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={generateInsights} disabled={generating} className="gap-2">
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Refresh Insights
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
