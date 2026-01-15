import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { MessageSquare, Send, Download, Clock, Users } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { AppLayout } from '@/components/AppLayout';

export default function MessagingAnalytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSent: 0,
    totalReceived: 0,
    avgResponseTime: 0,
    activeConversations: 0,
    mediaShared: 0
  });
  const [dailyActivity, setDailyActivity] = useState<any[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<any[]>([]);
  const [topConversations, setTopConversations] = useState<any[]>([]);
  const [mediaBreakdown, setMediaBreakdown] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;

    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

    // Overall stats
    const { data: sentMessages } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('sender_id', user.id)
      .gte('created_at', thirtyDaysAgo);

    const { data: receivedMessages } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .neq('sender_id', user.id)
      .gte('created_at', thirtyDaysAgo);

    const { data: conversations } = await supabase
      .from('conversation_participants')
      .select('conversation_id', { count: 'exact' })
      .eq('user_id', user.id);

    const { data: mediaMessages } = await supabase
      .from('message_attachments')
      .select('id', { count: 'exact' })
      .gte('created_at', thirtyDaysAgo);

    // Calculate actual response time from message timestamps
    let avgResponseTime = 0;
    try {
      // Get conversations where user is a participant
      const { data: userConversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (userConversations && userConversations.length > 0) {
        const conversationIds = userConversations.map(c => c.conversation_id);
        
        // Get messages in these conversations, ordered by conversation and timestamp
        const { data: allMessages } = await supabase
          .from('messages')
          .select('id, conversation_id, sender_id, created_at')
          .in('conversation_id', conversationIds)
          .gte('created_at', thirtyDaysAgo)
          .order('conversation_id', { ascending: true })
          .order('created_at', { ascending: true });

        if (allMessages && allMessages.length > 1) {
          // Calculate response times: time between a message from someone else and user's reply
          const responseTimes: number[] = [];
          for (let i = 0; i < allMessages.length - 1; i++) {
            const current = allMessages[i];
            const next = allMessages[i + 1];
            
            // If current message is from someone else and next is from user (response)
            if (current.conversation_id === next.conversation_id &&
                current.sender_id !== user.id &&
                next.sender_id === user.id) {
              const responseTime = new Date(next.created_at).getTime() - 
                                   new Date(current.created_at).getTime();
              responseTimes.push(responseTime / (1000 * 60)); // Convert to minutes
            }
          }
          
          if (responseTimes.length > 0) {
            avgResponseTime = Math.round(
              responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
            );
          }
        }
      }
    } catch (error) {
      console.error('Error calculating response time:', error);
    }

    setStats({
      totalSent: sentMessages?.length || 0,
      totalReceived: receivedMessages?.length || 0,
      avgResponseTime: avgResponseTime || 0,
      activeConversations: conversations?.length || 0,
      mediaShared: mediaMessages?.length || 0
    });

    // Daily activity (last 7 days)
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { data: sent } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('sender_id', user.id)
        .gte('created_at', `${dateStr}T00:00:00`)
        .lt('created_at', `${dateStr}T23:59:59`);

      const { data: received } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .neq('sender_id', user.id)
        .gte('created_at', `${dateStr}T00:00:00`)
        .lt('created_at', `${dateStr}T23:59:59`);

      dailyData.push({
        date: format(date, 'MMM d'),
        sent: sent?.length || 0,
        received: received?.length || 0
      });
    }
    setDailyActivity(dailyData);

    // Hourly distribution
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      messages: 0
    }));

    const { data: allMessages } = await supabase
      .from('messages')
      .select('created_at')
      .eq('sender_id', user.id)
      .gte('created_at', thirtyDaysAgo);

    allMessages?.forEach(msg => {
      const hour = new Date(msg.created_at).getHours();
      hourlyData[hour].messages++;
    });

    setHourlyDistribution(hourlyData);

    // Media breakdown
    const { data: attachments } = await supabase
      .from('message_attachments')
      .select('file_type')
      .gte('created_at', thirtyDaysAgo);

    const breakdown = attachments?.reduce((acc: any, att) => {
      const type = att.file_type.split('/')[0];
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const mediaData = Object.entries(breakdown || {}).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count as number
    }));

    setMediaBreakdown(mediaData);
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', 'hsl(var(--muted))'];

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Messaging Analytics</h1>
        <p className="text-muted-foreground">Insights into your communication patterns</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReceived}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Avg Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime}m</div>
            <p className="text-xs text-muted-foreground">Response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              Active Chats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeConversations}</div>
            <p className="text-xs text-muted-foreground">Conversations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4 text-purple-500" />
              Media
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mediaShared}</div>
            <p className="text-xs text-muted-foreground">Files shared</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity (Last 7 Days)</CardTitle>
              <CardDescription>Messages sent and received each day</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sent" fill="hsl(var(--primary))" name="Sent" />
                  <Bar dataKey="received" fill="hsl(var(--accent))" name="Received" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Distribution</CardTitle>
              <CardDescription>When you send messages throughout the day</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="messages" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Media Breakdown</CardTitle>
              <CardDescription>Types of files shared</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mediaBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {mediaBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
