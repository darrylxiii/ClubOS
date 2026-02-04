import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Lightbulb, ArrowRight, RefreshCw, Brain } from 'lucide-react';
import { DynamicChart } from '@/components/charts/DynamicChart';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

interface CareerInsights {
  skillGapAnalysis: Array<{ skill: string; current: number; required: number }>;
  marketPosition: { percentile: number; salaryRange: { min: number; max: number }; demandLevel: string };
  careerTrends: Array<{ trend: string; impact: 'positive' | 'neutral' | 'negative'; description: string }>;
  nextActions: Array<{ action: string; priority: 'high' | 'medium' | 'low'; reason: string }>;
}

export default function CareerInsightsDashboard() {
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
      logger.error('Error loading insights', error as Error, { componentName: 'CareerInsightsDashboard' });
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    setGenerating(true);
    try {
      // Call the edge function for AI-powered insights
      const { data, error } = await supabase.functions.invoke('generate-career-insights', {
        body: { userId: user?.id }
      });

      if (error) {
        throw error;
      }

      if (data) {
        setInsights({
          skillGapAnalysis: data.skill_gap_analysis || [],
          marketPosition: data.market_position || { percentile: 0, salaryRange: { min: 0, max: 0 }, demandLevel: 'unknown' },
          careerTrends: data.career_trends || [],
          nextActions: data.next_actions || [],
        });
        toast.success('Career insights generated successfully');
      }
    } catch (error) {
      logger.error('Error generating insights', error as Error, { componentName: 'CareerInsightsDashboard' });
      toast.error('Failed to generate career insights');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8" /> Career Insights
            </h1>
            <p className="text-muted-foreground">AI-powered career analysis and recommendations</p>
          </div>
          <Button onClick={generateInsights} disabled={generating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate Insights'}
          </Button>
        </div>

        {insights ? (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Skill Gap Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Skill Gap Analysis</CardTitle>
                <CardDescription>Your skills vs market requirements</CardDescription>
              </CardHeader>
              <CardContent>
                <DynamicChart
                  type="radar"
                  data={insights.skillGapAnalysis}
                  height={280}
                  config={{
                    angleAxisKey: 'skill',
                    radars: [
                      { dataKey: 'current', name: 'Current', stroke: 'hsl(var(--primary))', fill: 'hsl(var(--primary))', fillOpacity: 0.3 },
                      { dataKey: 'required', name: 'Required', stroke: 'hsl(var(--destructive))', fill: 'hsl(var(--destructive))', fillOpacity: 0.1 },
                    ],
                  }}
                />
              </CardContent>
            </Card>

            {/* Market Position */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Market Position</CardTitle>
                <CardDescription>How you compare in the market</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-5xl font-bold text-primary">{insights.marketPosition.percentile}th</p>
                  <p className="text-muted-foreground">Percentile in your field</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Salary Range</p>
                    <p className="font-semibold">
                      ${(insights.marketPosition.salaryRange.min / 1000).toFixed(0)}k - ${(insights.marketPosition.salaryRange.max / 1000).toFixed(0)}k
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Demand Level</p>
                    <Badge variant={insights.marketPosition.demandLevel === 'high' ? 'default' : 'secondary'}>
                      {insights.marketPosition.demandLevel}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Career Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Career Trends</CardTitle>
                <CardDescription>Industry trends affecting your career</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.careerTrends.map((trend, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Badge variant={trend.impact === 'positive' ? 'default' : trend.impact === 'negative' ? 'destructive' : 'secondary'}>
                        {trend.impact}
                      </Badge>
                      <div>
                        <p className="font-medium">{trend.trend}</p>
                        <p className="text-sm text-muted-foreground">{trend.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Next Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5" />Recommended Actions</CardTitle>
                <CardDescription>QUIN's personalized recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.nextActions.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <Badge variant={action.priority === 'high' ? 'destructive' : action.priority === 'medium' ? 'default' : 'secondary'}>
                        {action.priority}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{action.action}</p>
                        <p className="text-sm text-muted-foreground">{action.reason}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Insights Generated Yet</h3>
              <p className="text-muted-foreground mb-6">Click "Generate Insights" to get AI-powered career recommendations</p>
              <Button onClick={generateInsights} disabled={generating}>
                <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                Generate Insights
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
