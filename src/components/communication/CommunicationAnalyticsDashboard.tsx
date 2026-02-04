import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DynamicChart } from '@/components/charts/DynamicChart';
import { 
  BarChart3, 
  Mail, 
  MessageCircle, 
  Phone, 
  Video,
  TrendingUp,
  Clock,
  Users,
  DollarSign,
  RefreshCw,
  Download,
} from 'lucide-react';
import { useCommunicationAnalytics } from '@/hooks/useCommunicationAnalytics';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const CHANNEL_COLORS = {
  email: 'hsl(var(--primary))',
  whatsapp: '#25D366',
  meeting: '#FF6B6B',
  phone: '#FFD93D',
};

export function CommunicationAnalyticsDashboard() {
  const { loading, analytics, fetchAnalytics } = useCommunicationAnalytics();
  const [dateRange, setDateRange] = useState('30d');

  useEffect(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const end = new Date().toISOString();
    fetchAnalytics({ date_range: { start, end } });
  }, [dateRange, fetchAnalytics]);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
      case 'meeting': return <Video className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      default: return null;
    }
  };

  const pieData = analytics ? [
    { name: 'Email', value: analytics.channel_breakdown.email, fill: CHANNEL_COLORS.email },
    { name: 'WhatsApp', value: analytics.channel_breakdown.whatsapp, fill: CHANNEL_COLORS.whatsapp },
    { name: 'Meeting', value: analytics.channel_breakdown.meeting, fill: CHANNEL_COLORS.meeting },
    { name: 'Phone', value: analytics.channel_breakdown.phone, fill: CHANNEL_COLORS.phone },
  ].filter(d => d.value > 0) : [];

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Communication Analytics</h2>
          <p className="text-muted-foreground">Track communication performance and revenue attribution</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => fetchAnalytics()}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Communications</p>
                  <p className="text-3xl font-bold">{analytics.summary.total_communications}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Response Rate</p>
                  <p className="text-3xl font-bold">{analytics.summary.overall_response_rate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                  <p className="text-3xl font-bold">{analytics.summary.avg_response_time_hours}h</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unique Contacts</p>
                  <p className="text-3xl font-bold">{analytics.summary.unique_contacts}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {analytics && (
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activity">Daily Activity</TabsTrigger>
            <TabsTrigger value="channels">Channel Performance</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment Trend</TabsTrigger>
            <TabsTrigger value="revenue">Revenue Attribution</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle>Daily Communication Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <DynamicChart
                  type="area"
                  data={analytics.daily_activity}
                  height={300}
                  config={{
                    xAxisKey: 'date',
                    xAxisFormatter: (value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    areas: [
                      { dataKey: 'sent', name: 'Sent', stroke: 'hsl(var(--primary))', fill: 'hsl(var(--primary))', fillOpacity: 0.2 },
                      { dataKey: 'received', name: 'Received', stroke: '#22c55e', fill: '#22c55e', fillOpacity: 0.2 },
                    ],
                    showTooltip: true,
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="channels">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
                <CardHeader>
                  <CardTitle>Channel Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <DynamicChart
                    type="pie"
                    data={pieData}
                    height={250}
                    config={{
                      pie: {
                        dataKey: 'value',
                        innerRadius: 60,
                        outerRadius: 90,
                        paddingAngle: 2,
                        colors: pieData.map(d => d.fill),
                      },
                      showTooltip: true,
                    }}
                  />
                  <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {pieData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                        <span className="text-sm">{entry.name}: {entry.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
                <CardHeader>
                  <CardTitle>Response Rate by Channel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.channel_response_rates.map((channel) => (
                      <div key={channel.channel} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getChannelIcon(channel.channel)}
                            <span className="text-sm font-medium capitalize">{channel.channel}</span>
                          </div>
                          <Badge variant="secondary">{channel.response_rate}%</Badge>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${channel.response_rate}%`,
                              backgroundColor: CHANNEL_COLORS[channel.channel as keyof typeof CHANNEL_COLORS] || 'hsl(var(--primary))'
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Sent: {channel.sent}</span>
                          <span>Replied: {channel.replied}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sentiment">
            <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle>Sentiment Trend Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <DynamicChart
                  type="line"
                  data={analytics.sentiment_trend}
                  height={300}
                  config={{
                    xAxisKey: 'date',
                    xAxisFormatter: (value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    yAxisDomain: [0, 1],
                    yAxisFormatter: (value) => `${(value * 100).toFixed(0)}%`,
                    lines: [{
                      dataKey: 'avg_sentiment',
                      stroke: 'hsl(var(--primary))',
                      strokeWidth: 2,
                      dot: { fill: 'hsl(var(--primary))' },
                    }],
                    showTooltip: true,
                    tooltip: {
                      formatter: (value: number) => [`${(value * 100).toFixed(0)}%`, 'Sentiment'],
                      labelFormatter: (label) => new Date(label).toLocaleDateString(),
                    },
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue">
            <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Revenue Attribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                    <p className="text-4xl font-bold text-green-500">
                      {analytics.revenue_attribution.total_placements}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">Total Placements</p>
                  </div>
                  <div className="p-6 rounded-lg bg-primary/10 border border-primary/20 text-center">
                    <p className="text-4xl font-bold text-primary">
                      {analytics.revenue_attribution.attributed_to_communication}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">Communication-Attributed</p>
                  </div>
                </div>
                <div className="mt-6 p-4 rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-2">Peak Activity Hours</h4>
                  <div className="flex flex-wrap gap-2">
                    {analytics.peak_hours.map((hour) => (
                      <Badge key={hour} variant="secondary">
                        {hour}:00 - {hour + 1}:00
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Schedule outreach during these hours for best engagement
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
