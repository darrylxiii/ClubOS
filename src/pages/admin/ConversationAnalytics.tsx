import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Clock, TrendingUp, Smile, Meh, Frown } from 'lucide-react';
import { DynamicChart } from '@/components/charts/DynamicChart';
import { format, subDays } from 'date-fns';

interface ConversationMetrics {
  totalMessages: number;
  avgResponseTime: number;
  uniqueConversations: number;
  aiAssistedCount: number;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  dailyTrend: Array<{ date: string; messages: number; conversations: number }>;
}

export default function ConversationAnalytics() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ConversationMetrics>({
    totalMessages: 0,
    avgResponseTime: 0,
    uniqueConversations: 0,
    aiAssistedCount: 0,
    sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
    dailyTrend: [],
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      // Fetch from conversation_analytics_daily
      const { data: analyticsData } = await (supabase as any)
        .from('conversation_analytics_daily')
        .select('*')
        .gte('date', format(subDays(new Date(), 30), 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (analyticsData && analyticsData.length > 0) {
        const totals = analyticsData.reduce((acc: any, day: any) => ({
          messages: acc.messages + (day.total_messages || 0),
          conversations: acc.conversations + (day.unique_conversations || 0),
          aiAssisted: acc.aiAssisted + (day.ai_assisted_count || 0),
          positive: acc.positive + (day.sentiment_positive || 0),
          neutral: acc.neutral + (day.sentiment_neutral || 0),
          negative: acc.negative + (day.sentiment_negative || 0),
          responseTimeSum: acc.responseTimeSum + ((day.avg_response_time_minutes || 0) * (day.total_messages || 1)),
        }), { messages: 0, conversations: 0, aiAssisted: 0, positive: 0, neutral: 0, negative: 0, responseTimeSum: 0 });

        setMetrics({
          totalMessages: totals.messages,
          avgResponseTime: totals.messages > 0 ? Math.round(totals.responseTimeSum / totals.messages) : 0,
          uniqueConversations: totals.conversations,
          aiAssistedCount: totals.aiAssisted,
          sentimentBreakdown: { positive: totals.positive, neutral: totals.neutral, negative: totals.negative },
          dailyTrend: analyticsData.map((d: any) => ({
            date: format(new Date(d.date), 'MMM d'),
            messages: d.total_messages || 0,
            conversations: d.unique_conversations || 0,
          })),
        });
      }
    } catch (error) {
      console.error('Error loading conversation metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const sentimentData = [
    { name: 'Positive', value: metrics.sentimentBreakdown.positive, color: 'hsl(142, 76%, 36%)' },
    { name: 'Neutral', value: metrics.sentimentBreakdown.neutral, color: 'hsl(var(--muted-foreground))' },
    { name: 'Negative', value: metrics.sentimentBreakdown.negative, color: 'hsl(0, 84%, 60%)' },
  ].filter(s => s.value > 0);

  if (loading) {
    return (
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Conversation Analytics</h1>
          <p className="text-muted-foreground">Messaging metrics and communication insights</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg"><MessageSquare className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-bold">{metrics.totalMessages.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Messages (30d)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg"><Clock className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-bold">{metrics.avgResponseTime}m</p>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg"><TrendingUp className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-bold">{metrics.uniqueConversations}</p>
                  <p className="text-sm text-muted-foreground">Active Conversations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg"><Smile className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-bold">{metrics.aiAssistedCount}</p>
                  <p className="text-sm text-muted-foreground">AI-Assisted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Message Volume Trend</CardTitle>
              <CardDescription>Daily message and conversation counts</CardDescription>
            </CardHeader>
            <CardContent>
              <DynamicChart
                type="line"
                data={metrics.dailyTrend}
                height={300}
                config={{
                  xAxisKey: 'date',
                  lines: [
                    { dataKey: 'messages', stroke: 'hsl(var(--primary))', name: 'Messages' },
                    { dataKey: 'conversations', stroke: 'hsl(var(--secondary))', name: 'Conversations' },
                  ],
                  showTooltip: true,
                  legend: true,
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sentiment Analysis</CardTitle>
              <CardDescription>Communication sentiment breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {sentimentData.length > 0 ? (
                <DynamicChart
                  type="pie"
                  data={sentimentData}
                  height={300}
                  config={{
                    pie: {
                      dataKey: 'value',
                      outerRadius: 100,
                      colors: sentimentData.map(d => d.color),
                      label: ({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`,
                      labelLine: false,
                    },
                    showTooltip: true,
                  }}
                />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No sentiment data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
