import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, Send, CheckCheck, Clock, TrendingUp, Users, Zap, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DynamicChart } from '@/components/charts/DynamicChart';
import { format, subDays } from 'date-fns';

export default function WhatsAppAnalytics() {
  const [period, setPeriod] = useState('7d');

  const { data: analytics } = useQuery({
    queryKey: ['whatsapp-analytics', period],
    queryFn: async () => {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = subDays(new Date(), days).toISOString();

      const { data: messages } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .gte('created_at', startDate);

      const { data: conversations } = await supabase
        .from('whatsapp_conversations')
        .select('*');

      const { data: templates } = await supabase
        .from('whatsapp_templates')
        .select('*');

      return { messages: messages || [], conversations: conversations || [], templates: templates || [] };
    },
  });

  const totalMessages = analytics?.messages.length || 0;
  const sentMessages = analytics?.messages.filter(m => m.direction === 'outbound').length || 0;
  const receivedMessages = analytics?.messages.filter(m => m.direction === 'inbound').length || 0;
  const deliveredMessages = analytics?.messages.filter(m => m.status === 'delivered' || m.status === 'read').length || 0;
  const readMessages = analytics?.messages.filter(m => m.status === 'read').length || 0;
  const activeConversations = analytics?.conversations.filter(c => c.conversation_status === 'active').length || 0;

  const deliveryRate = sentMessages > 0 ? ((deliveredMessages / sentMessages) * 100).toFixed(1) : 0;
  const readRate = deliveredMessages > 0 ? ((readMessages / deliveredMessages) * 100).toFixed(1) : 0;

  // Generate chart data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayMessages = analytics?.messages.filter(m => 
      format(new Date(m.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    ) || [];
    return {
      date: format(date, 'MMM dd'),
      sent: dayMessages.filter(m => m.direction === 'outbound').length,
      received: dayMessages.filter(m => m.direction === 'inbound').length,
    };
  });

  const intentData = [
    { name: 'Interested', value: analytics?.messages.filter(m => m.intent_classification === 'interested').length || 0, color: 'hsl(var(--chart-1))' },
    { name: 'Question', value: analytics?.messages.filter(m => m.intent_classification === 'question').length || 0, color: 'hsl(var(--chart-2))' },
    { name: 'Neutral', value: analytics?.messages.filter(m => m.intent_classification === 'neutral' || !m.intent_classification).length || 0, color: 'hsl(var(--chart-3))' },
    { name: 'Negative', value: analytics?.messages.filter(m => m.intent_classification === 'negative').length || 0, color: 'hsl(var(--chart-4))' },
  ];

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">WhatsApp Analytics</h1>
              <p className="text-muted-foreground">Monitor messaging performance and engagement</p>
            </div>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Send className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{sentMessages}</p>
                    <p className="text-xs text-muted-foreground">Messages Sent</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{receivedMessages}</p>
                    <p className="text-xs text-muted-foreground">Replies Received</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <CheckCheck className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{deliveryRate}%</p>
                    <p className="text-xs text-muted-foreground">Delivery Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Target className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{readRate}%</p>
                    <p className="text-xs text-muted-foreground">Read Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="conversations">Conversations</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Message Volume</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DynamicChart
                      type="line"
                      data={chartData}
                      height={250}
                      config={{
                        xAxisKey: 'date',
                        lines: [
                          { dataKey: 'sent', stroke: 'hsl(var(--chart-1))', strokeWidth: 2 },
                          { dataKey: 'received', stroke: 'hsl(var(--chart-2))', strokeWidth: 2 },
                        ],
                        showTooltip: true,
                      }}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Intent Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DynamicChart
                      type="pie"
                      data={intentData}
                      height={250}
                      config={{
                        pie: {
                          dataKey: 'value',
                          innerRadius: 60,
                          outerRadius: 80,
                          paddingAngle: 5,
                          colors: intentData.map(d => d.color),
                        },
                        showTooltip: true,
                      }}
                    />
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                      {intentData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm">{item.name}: {item.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Active Conversations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Active</span>
                        <span className="text-sm font-medium">{activeConversations}</span>
                      </div>
                      <Progress value={(activeConversations / (analytics?.conversations.length || 1)) * 100} className="h-2" />
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500">
                      {analytics?.conversations.length || 0} Total
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Template Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics?.templates.map((template) => {
                      const templateMessages = analytics?.messages.filter(m => m.template_name === template.template_name) || [];
                      const sent = templateMessages.length;
                      const delivered = templateMessages.filter(m => m.status === 'delivered' || m.status === 'read').length;
                      const rate = sent > 0 ? ((delivered / sent) * 100).toFixed(0) : 0;
                      
                      return (
                        <div key={template.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">{template.template_name}</p>
                            <p className="text-sm text-muted-foreground">{template.language_code}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{sent} sent</p>
                            <p className="text-sm text-muted-foreground">{rate}% delivered</p>
                          </div>
                        </div>
                      );
                    })}
                    {(!analytics?.templates || analytics.templates.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">No templates yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conversations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Conversation Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">{analytics?.conversations.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Total Conversations</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <Zap className="h-6 w-6 mx-auto mb-2 text-green-500" />
                      <p className="text-2xl font-bold">{activeConversations}</p>
                      <p className="text-xs text-muted-foreground">Active (24h window)</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <Clock className="h-6 w-6 mx-auto mb-2 text-amber-500" />
                      <p className="text-2xl font-bold">
                        {analytics?.conversations.filter(c => (c.unread_count || 0) > 0).length || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Needs Response</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                      <p className="text-2xl font-bold">{totalMessages}</p>
                      <p className="text-xs text-muted-foreground">Total Messages</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
