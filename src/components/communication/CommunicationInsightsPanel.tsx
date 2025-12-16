import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, Lightbulb, TrendingUp, AlertTriangle, Target, Sparkles, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CommunicationInsightsPanelProps {
  entityType: string;
  entityId: string;
  relationshipScore?: {
    engagement_score: number | null;
    response_rate: number | null;
    avg_sentiment: number | null;
    total_communications: number | null;
    risk_level: string | null;
    recommended_action: string | null;
    preferred_channel: string | null;
  } | null;
  insights?: {
    summary?: string;
    key_topics?: string[];
    relationship_strength?: string;
    next_best_action?: string;
    conversion_probability?: number;
    engagement_trend?: 'improving' | 'stable' | 'declining';
  } | null;
  loading?: boolean;
  onGenerateInsights?: () => void;
  onRefresh?: () => void;
}

export function CommunicationInsightsPanel({
  entityType,
  entityId,
  relationshipScore,
  insights,
  loading,
  onGenerateInsights,
  onRefresh
}: CommunicationInsightsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const engagementScore = relationshipScore?.engagement_score || 0;
  const responseRate = Math.round((relationshipScore?.response_rate || 0) * 100);
  const sentiment = relationshipScore?.avg_sentiment || 0;

  const trendConfig = {
    improving: { icon: TrendingUp, color: 'text-green-500', label: 'Improving' },
    stable: { icon: Target, color: 'text-blue-500', label: 'Stable' },
    declining: { icon: AlertTriangle, color: 'text-orange-500', label: 'Declining' }
  };

  const trend = insights?.engagement_trend ? trendConfig[insights.engagement_trend] : null;
  const TrendIcon = trend?.icon;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">Communication Intelligence</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {onRefresh && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <CardContent className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold">{engagementScore.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">Engagement</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold">{responseRate}%</p>
                  <p className="text-[10px] text-muted-foreground">Response</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className={cn(
                    "text-lg font-bold",
                    sentiment > 0 ? "text-green-500" : sentiment < 0 ? "text-red-500" : ""
                  )}>
                    {sentiment > 0 ? '+' : ''}{(sentiment * 100).toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">Sentiment</p>
                </div>
              </div>

              {/* Engagement Trend */}
              {trend && TrendIcon && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <TrendIcon className={cn("h-4 w-4", trend.color)} />
                  <span className="text-sm">Engagement is <strong className={trend.color}>{trend.label.toLowerCase()}</strong></span>
                </div>
              )}

              {/* AI Summary */}
              {insights?.summary && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-1 mb-2">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium text-primary">AI Summary</span>
                  </div>
                  <p className="text-sm">{insights.summary}</p>
                </div>
              )}

              {/* Conversion Probability */}
              {insights?.conversion_probability !== undefined && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Conversion Probability</span>
                    <span className="font-medium">{Math.round(insights.conversion_probability * 100)}%</span>
                  </div>
                  <Progress value={insights.conversion_probability * 100} className="h-2" />
                </div>
              )}

              {/* Key Topics */}
              {insights?.key_topics && insights.key_topics.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Key Topics Discussed</p>
                  <div className="flex flex-wrap gap-1">
                    {insights.key_topics.map((topic, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Best Action */}
              {(insights?.next_best_action || relationshipScore?.recommended_action) && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-center gap-1 mb-1">
                    <Lightbulb className="h-3 w-3 text-yellow-600" />
                    <span className="text-xs font-medium text-yellow-600">Next Best Action</span>
                  </div>
                  <p className="text-sm">{insights?.next_best_action || relationshipScore?.recommended_action}</p>
                </div>
              )}

              {/* Preferred Channel */}
              {relationshipScore?.preferred_channel && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Preferred Channel</span>
                  <Badge variant="outline" className="capitalize">
                    {relationshipScore.preferred_channel}
                  </Badge>
                </div>
              )}

              {/* Generate Insights Button */}
              {onGenerateInsights && !insights?.summary && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={onGenerateInsights}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate AI Insights
                </Button>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
