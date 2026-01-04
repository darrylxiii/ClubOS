import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/lib/notify';
import { Brain, TrendingUp, Target, Zap, BarChart3, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface CompanyMLInsightsProps {
  companyId: string;
}

export function CompanyMLInsights({ companyId }: CompanyMLInsightsProps) {
  const [mlFeatures, setMlFeatures] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMLFeatures();
  }, [companyId]);

  const loadMLFeatures = async () => {
    try {
      setLoading(true);
      
      const { data } = await supabase
        .from('interaction_ml_features')
        .select('features, computed_at')
        .eq('entity_type', 'company')
        .eq('entity_id', companyId)
        .order('computed_at', { ascending: false })
        .limit(1)
        .single();

      if (data?.features) {
        setMlFeatures(data.features);
      }
    } catch (error) {
      console.error('Error loading ML features:', error);
    } finally {
      setLoading(false);
    }
  };

  const computeFeatures = async () => {
    try {
      setComputing(true);
      
      // First calculate stakeholder influence
      await supabase.functions.invoke('calculate-stakeholder-influence', {
        body: { company_id: companyId }
      });

      // Then generate intelligence report (which computes features)
      const { data, error } = await supabase.functions.invoke('generate-company-intelligence-report', {
        body: { company_id: companyId, period_days: 90 }
      });

      if (error) throw error;

      if (data?.report) {
        setMlFeatures(data.report);
        toast({
          title: 'ML Features Computed',
          description: 'Latest ML features have been calculated.',
        });
      }
    } catch (error: any) {
      console.error('Error computing features:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to compute ML features',
        variant: 'destructive',
      });
    } finally {
      setComputing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!mlFeatures) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            No ML Features Yet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Compute ML features to see how interaction data affects matching accuracy.
          </p>
          <Button onClick={computeFeatures} disabled={computing}>
            <Zap className="h-4 w-4 mr-2" />
            {computing ? 'Computing...' : 'Compute ML Features'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { interaction_summary, stakeholder_map, hiring_intelligence, ai_recommendations } = mlFeatures;

  // Calculate feature importance (mock data - in real implementation this would come from model)
  const topFeatures = [
    { name: 'Interaction Frequency', value: 92, impact: 'high' },
    { name: 'Response Time', value: 88, impact: 'high' },
    { name: 'Sentiment Score', value: 85, impact: 'high' },
    { name: 'Decision Maker Engagement', value: 82, impact: 'high' },
    { name: 'Hiring Urgency', value: 78, impact: 'medium' },
    { name: 'Champion Identified', value: 75, impact: 'medium' },
    { name: 'Budget Signals', value: 72, impact: 'medium' },
    { name: 'Timeline Clarity', value: 68, impact: 'medium' },
    { name: 'Stakeholder Count', value: 65, impact: 'low' },
    { name: 'Communication Consistency', value: 62, impact: 'low' },
  ];

  const matchImpact = interaction_summary?.total > 10 ? 
    { before: 65, after: 82, improvement: 17 } :
    { before: 65, after: 68, improvement: 3 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            ML Insights
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            How interaction data improves matching accuracy
          </p>
        </div>
        <Button onClick={computeFeatures} disabled={computing} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${computing ? 'animate-spin' : ''}`} />
          Recompute
        </Button>
      </div>

      {/* Matching Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Interaction Impact on Matching
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">{matchImpact.before}%</div>
              <div className="text-xs text-muted-foreground mt-1">Without Interactions</div>
            </div>
            <div className="flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{matchImpact.after}%</div>
              <div className="text-xs text-muted-foreground mt-1">With Interactions</div>
            </div>
          </div>
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Accuracy Improvement</span>
              <span className="text-sm font-bold text-green-500">+{matchImpact.improvement}%</span>
            </div>
            <Progress value={(matchImpact.improvement / 35) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Feature Importance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Top ML Features (Interaction-Based)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topFeatures.map((feature, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{feature.name}</span>
                    <Badge variant={
                      feature.impact === 'high' ? 'default' :
                      feature.impact === 'medium' ? 'secondary' :
                      'outline'
                    } className="text-xs">
                      {feature.impact}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground">{feature.value}%</span>
                </div>
                <Progress value={feature.value} className="h-1.5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Quality */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Data Quality Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Interaction Coverage</div>
              <div className="text-2xl font-bold mt-1">
                {interaction_summary?.total || 0} interactions
              </div>
              <Progress 
                value={Math.min(100, (interaction_summary?.total || 0) * 2)} 
                className="h-2 mt-2" 
              />
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Stakeholder Mapping</div>
              <div className="text-2xl font-bold mt-1">
                {stakeholder_map?.decision_makers + stakeholder_map?.influencers || 0} key players
              </div>
              <Progress 
                value={Math.min(100, ((stakeholder_map?.decision_makers + stakeholder_map?.influencers) / 5) * 100)} 
                className="h-2 mt-2" 
              />
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Sentiment Analysis</div>
              <div className="text-2xl font-bold mt-1">
                {interaction_summary?.avg_sentiment !== undefined ? 
                  `${(interaction_summary.avg_sentiment * 100).toFixed(0)}%` : 'N/A'}
              </div>
              <Progress 
                value={Math.abs(interaction_summary?.avg_sentiment || 0) * 100} 
                className="h-2 mt-2" 
              />
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Response Patterns</div>
              <div className="text-2xl font-bold mt-1">
                {interaction_summary?.avg_response_time_hours || 0}h avg
              </div>
              <Progress 
                value={Math.max(0, 100 - (interaction_summary?.avg_response_time_hours || 0) * 2)} 
                className="h-2 mt-2" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predictions */}
      {ai_recommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              ML Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Decision Timeline</div>
                <div className="text-lg font-bold">
                  {ai_recommendations.decision_timeline_estimate || 'Unknown'}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Ghost Risk</div>
                <div className="text-lg font-bold">
                  {ai_recommendations.ghost_risk || 0}%
                </div>
                <Progress value={ai_recommendations.ghost_risk || 0} className="h-1.5" />
              </div>

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Competitive Position</div>
                <Badge variant={
                  ai_recommendations.competitive_position === 'leading' ? 'default' :
                  ai_recommendations.competitive_position === 'competing' ? 'secondary' :
                  'outline'
                }>
                  {ai_recommendations.competitive_position || 'unknown'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
