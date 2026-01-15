import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/lib/notify';
import { 
  Brain, TrendingUp, AlertCircle, Target, Zap, 
  RefreshCw, CheckCircle, Clock, Filter 
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface LiveInsight {
  id: string;
  interaction_id: string;
  insight_type: string;
  insight_text: string;
  confidence_score: number;
  created_at: string;
  extracted_budget?: number;
  extracted_date?: string;
  extracted_headcount?: number;
  evidence_quotes?: string[];
  interaction?: {
    interaction_type: string;
    interaction_date: string;
    subject: string;
    is_test_data?: boolean;
    company?: { name: string };
  };
}

export function EnhancedMLDashboard() {
  const [insights, setInsights] = useState<LiveInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTestData, setShowTestData] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadInsights();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('live-insights')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interaction_insights'
        },
        () => {
          console.log('[Live Insights] New data detected, refreshing...');
          loadInsights();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showTestData]);

  const loadInsights = async () => {
    try {
      setLoading(true);

      const query = supabase
        .from('interaction_insights')
        .select(`
          *,
          interaction:company_interactions(
            interaction_type,
            interaction_date,
            subject,
            is_test_data,
            company:companies(name)
          )
        `)
        .in('insight_type', ['hiring_urgency', 'budget_signals', 'pain_points', 'decision_stage'])
        .order('created_at', { ascending: false })
        .limit(50);

      const { data, error } = await query;

      if (error) throw error;

      // Filter test data if needed
      let filteredData = data || [];
      if (!showTestData) {
        filteredData = filteredData.filter(
          (insight: any) => !insight.interaction?.is_test_data
        );
      }

      setInsights(filteredData as LiveInsight[]);
    } catch (error: any) {
      console.error('Error loading insights:', error);
      toast({
        title: 'Error',
        description: 'Failed to load live insights',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'hiring_urgency': return <Clock className="h-4 w-4" />;
      case 'budget_signals': return <TrendingUp className="h-4 w-4" />;
      case 'pain_points': return <AlertCircle className="h-4 w-4" />;
      case 'decision_stage': return <Target className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'hiring_urgency': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'budget_signals': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pain_points': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'decision_stage': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatInsightType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            No Live Insights Yet
          </CardTitle>
          <CardDescription>
            Process interaction data to see AI-extracted intelligence appear here in real-time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Label htmlFor="show-test-data" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Show test data
            </Label>
            <Switch 
              id="show-test-data"
              checked={showTestData}
              onCheckedChange={setShowTestData}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Go to the Test Data Manager to seed sample data and see insights in action.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Live Insights Feed
          </h3>
          <p className="text-sm text-muted-foreground">
            Real-time intelligence extracted from interactions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Label htmlFor="show-test-data-header" className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4" />
            Show test data
          </Label>
          <Switch 
            id="show-test-data-header"
            checked={showTestData}
            onCheckedChange={setShowTestData}
          />
          <Button onClick={loadInsights} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {insights.map((insight) => (
          <Card key={insight.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className={getInsightColor(insight.insight_type)}
                  >
                    {getInsightIcon(insight.insight_type)}
                    <span className="ml-2">{formatInsightType(insight.insight_type)}</span>
                  </Badge>
                  {insight.interaction?.is_test_data && (
                    <Badge variant="secondary">Test Data</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(insight.created_at).toLocaleString()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insight.interaction && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{insight.interaction.company?.name}</span>
                    {' • '}
                    <span>{insight.interaction.subject || 'No subject'}</span>
                    {' • '}
                    <span>{new Date(insight.interaction.interaction_date).toLocaleDateString()}</span>
                  </div>
                )}
                
                <div className="text-sm space-y-1">
                  {insight.insight_type === 'hiring_urgency' && (
                    <div>
                      <p className="text-muted-foreground">{insight.insight_text}</p>
                    </div>
                  )}
                  
                  {insight.insight_type === 'budget_signals' && (
                    <div>
                      {insight.extracted_budget && (
                        <p><span className="font-medium">Budget: </span>€{insight.extracted_budget.toLocaleString()}</p>
                      )}
                      <p className="text-muted-foreground">{insight.insight_text}</p>
                    </div>
                  )}
                  
                  {insight.insight_type === 'pain_points' && (
                    <p className="text-muted-foreground">{insight.insight_text}</p>
                  )}
                  
                  {insight.insight_type === 'decision_stage' && (
                    <p className="text-muted-foreground">{insight.insight_text}</p>
                  )}

                  {insight.evidence_quotes && insight.evidence_quotes.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground">Evidence:</p>
                      <ul className="text-xs text-muted-foreground list-disc list-inside">
                        {insight.evidence_quotes.slice(0, 2).map((quote, i) => (
                          <li key={i}>{quote}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {insight.confidence_score && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <CheckCircle className="h-3 w-3" />
                    <span>Confidence: {Math.round(insight.confidence_score * 100)}%</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}