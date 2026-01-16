import { useState } from 'react';
import { aiService } from '@/services/aiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  RefreshCw,
  ChevronRight,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notify } from '@/lib/notify';

interface OutreachInsight {
  id: string;
  insight_type: string;
  insight_title: string;
  insight_content: string;
  severity: string;
  recommendations: any;
  expires_at: string;
  created_at: string;
  is_read: boolean;
}

export function AIInsightsPanel() {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: insights, isLoading } = useQuery({
    queryKey: ['outreach-insights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_outreach_insights')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('priority', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data as OutreachInsight[];
    }
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      const data = await aiService.generateOutreachInsights();

      // if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-insights'] });
      notify.success('Insights Generated', { description: 'New AI insights have been generated.' });
      setGenerating(false);
    },
    onError: () => {
      notify.error('Failed to generate insights');
      setGenerating(false);
    }
  });

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle2;
      case 'opportunity': return Lightbulb;
      case 'trend_up': return TrendingUp;
      case 'trend_down': return TrendingDown;
      default: return Sparkles;
    }
  };

  const getInsightColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500/30 bg-red-500/5';
      case 'high': return 'border-orange-500/30 bg-orange-500/5';
      case 'medium': return 'border-yellow-500/30 bg-yellow-500/5';
      default: return 'border-green-500/30 bg-green-500/5';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/30">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/30">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Medium</Badge>;
      default:
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/30">Low</Badge>;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Insights
            <Badge variant="secondary" className="ml-2">
              <Sparkles className="w-3 h-3 mr-1" />
              Live
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generating}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${generating ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : insights && insights.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {insights.map((insight, index) => {
                const InsightIcon = getInsightIcon(insight.insight_type);
                const recommendations = Array.isArray(insight.recommendations) ? insight.recommendations : [];

                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border-2 ${getInsightColor(insight.severity)} cursor-pointer hover:bg-muted/10 transition-colors`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${insight.severity === 'critical' ? 'bg-red-500/20' : insight.severity === 'high' ? 'bg-orange-500/20' : 'bg-primary/20'}`}>
                        <InsightIcon className={`w-4 h-4 ${insight.severity === 'critical' ? 'text-red-500' : insight.severity === 'high' ? 'text-orange-500' : 'text-primary'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{insight.insight_title}</h4>
                          {getSeverityBadge(insight.severity)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {insight.insight_content}
                        </p>

                        {/* Recommendations */}
                        {recommendations.length > 0 && (
                          <div className="space-y-1">
                            {recommendations.slice(0, 2).map((rec: string, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <Zap className="w-3 h-3 text-primary" />
                                <span>{rec}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-3">No insights available</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateMutation.mutate()}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Insights
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
