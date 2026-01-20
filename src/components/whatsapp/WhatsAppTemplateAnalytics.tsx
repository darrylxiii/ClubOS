import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Trophy,
  AlertTriangle,
  Clock,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  RefreshCw
} from 'lucide-react';
import { useWhatsAppTemplateAnalytics, type TemplatePerformance } from '@/hooks/useWhatsAppTemplateAnalytics';
import { cn } from '@/lib/utils';

interface WhatsAppTemplateAnalyticsProps {
  periodDays?: number;
  compact?: boolean;
}

export function WhatsAppTemplateAnalytics({ periodDays = 30, compact = false }: WhatsAppTemplateAnalyticsProps) {
  const { templates, topPerformer, needsAttention, averageResponseRate, isLoading, refetch } = useWhatsAppTemplateAnalytics(periodDays);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getResponseRateColor = (rate: number) => {
    if (rate >= 30) return 'text-emerald-500';
    if (rate >= 15) return 'text-amber-500';
    return 'text-red-500';
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Quick Stats */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Template Performance</span>
          </div>
          <Badge variant="outline" className="gap-1">
            <MessageSquare className="w-3 h-3" />
            {templates.length} templates
          </Badge>
        </div>

        {/* Top Performer */}
        {topPerformer && (
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
            <Trophy className="w-5 h-5 text-amber-500" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{topPerformer.templateName}</p>
              <p className="text-xs text-muted-foreground">Best response rate</p>
            </div>
            <Badge className="bg-emerald-500 text-white">{topPerformer.responseRate}%</Badge>
          </div>
        )}

        {/* Needs Attention */}
        {needsAttention.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">{needsAttention.length} templates need attention</p>
              <p className="text-xs text-muted-foreground">Response rate below 10%</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5" />
            Template Performance Analytics
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Avg {averageResponseRate}% response
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No template data yet</p>
            <p className="text-sm">Send messages using templates to see analytics</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {templates.map((template, index) => (
                <div
                  key={template.templateId}
                  className={cn(
                    'p-4 rounded-lg border transition-colors',
                    index === 0 && template.responseRate >= 20 && 'bg-emerald-500/5 border-emerald-500/20',
                    template.responseRate < 10 && template.sentCount >= 5 && 'bg-amber-500/5 border-amber-500/20'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {index === 0 && template.responseRate >= 20 && (
                        <Trophy className="w-4 h-4 text-amber-500" />
                      )}
                      <div>
                        <p className="font-medium">{template.templateName}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.sentCount} sent • Last {periodDays} days
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(template.trend)}
                      <span className={cn('text-lg font-bold', getResponseRateColor(template.responseRate))}>
                        {template.responseRate}%
                      </span>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div className="text-center p-2 rounded bg-muted/50">
                      <p className="text-lg font-semibold">{template.sentCount}</p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </div>
                    <div className="text-center p-2 rounded bg-muted/50">
                      <p className="text-lg font-semibold">{template.deliveryRate}%</p>
                      <p className="text-xs text-muted-foreground">Delivered</p>
                    </div>
                    <div className="text-center p-2 rounded bg-muted/50">
                      <p className="text-lg font-semibold">{template.readRate}%</p>
                      <p className="text-xs text-muted-foreground">Read</p>
                    </div>
                    <div className="text-center p-2 rounded bg-muted/50">
                      <p className="text-lg font-semibold">{template.repliedCount}</p>
                      <p className="text-xs text-muted-foreground">Replies</p>
                    </div>
                  </div>

                  {/* Response Rate Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Response Rate</span>
                      <span className="font-medium">{template.responseRate}%</span>
                    </div>
                    <Progress value={template.responseRate} className="h-1.5" />
                  </div>

                  {/* Additional Stats */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    {template.avgResponseTimeMinutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Avg response: {template.avgResponseTimeMinutes}m</span>
                      </div>
                    )}
                    {(template.positiveSentimentCount > 0 || template.negativeSentimentCount > 0) && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-emerald-500">
                          <ThumbsUp className="w-3 h-3" />
                          <span>{template.positiveSentimentCount}</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-500">
                          <ThumbsDown className="w-3 h-3" />
                          <span>{template.negativeSentimentCount}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
