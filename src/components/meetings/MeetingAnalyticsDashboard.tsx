import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Video, Users, Clock, TrendingUp, Zap, Calendar, Target, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalyticsData {
  totalMeetings: number;
  instantMeetings: number;
  scheduledMeetings: number;
  avgParticipants: number;
  avgDuration: number;
  totalParticipants: number;
  creationMethods: { name: string; value: number }[];
  weeklyTrend: { week: string; meetings: number }[];
  invitationMethods: { method: string; count: number }[];
  joinRate: number;
}

export function MeetingAnalyticsDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalMeetings: 0,
    instantMeetings: 0,
    scheduledMeetings: 0,
    avgParticipants: 0,
    avgDuration: 0,
    totalParticipants: 0,
    creationMethods: [],
    weeklyTrend: [],
    invitationMethods: [],
    joinRate: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch meeting analytics
      const { data: meetingData, error: meetingError } = await supabase
        .from('meeting_analytics')
        .select('*')
        .eq('meeting_id', user?.id);

      if (meetingError) throw meetingError;

      // Fetch meetings
      const { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('*, meeting_participants(count)')
        .eq('host_id', user?.id);

      if (meetingsError) throw meetingsError;

      // Calculate metrics
      const instantCount = meetings?.filter(m => m.created_via === 'instant').length || 0;
      const scheduledCount = meetings?.filter(m => m.created_via !== 'instant').length || 0;
      
      const totalParticipants = meetings?.reduce((sum, m) => {
        return sum + (m.meeting_participants?.[0]?.count || 0);
      }, 0) || 0;

      const avgParticipants = meetings && meetings.length > 0 
        ? totalParticipants / meetings.length 
        : 0;

      // Creation methods data
      const creationMethods = [
        { name: 'Instant', value: instantCount },
        { name: 'Scheduled', value: scheduledCount },
      ];

      // Weekly trend (last 8 weeks)
      const weeklyData = [];
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekMeetings = meetings?.filter(m => {
          const meetingDate = new Date(m.created_at);
          return meetingDate >= weekStart && meetingDate < weekEnd;
        }).length || 0;

        weeklyData.push({
          week: `Week ${8 - i}`,
          meetings: weekMeetings,
        });
      }

      // Invitation methods
      const { data: invitations } = await supabase
        .from('meeting_invitations')
        .select('invitation_method, status')
        .eq('inviter_id', user?.id);

      const methodCounts = invitations?.reduce((acc, inv) => {
        acc[inv.invitation_method] = (acc[inv.invitation_method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const invitationMethods = Object.entries(methodCounts).map(([method, count]) => ({
        method: method.charAt(0).toUpperCase() + method.slice(1),
        count: count as number,
      }));

      // Calculate join rate
      const totalInvited = invitations?.length || 0;
      const joinedCount = invitations?.filter(inv => inv.status === 'accepted' || inv.status === 'joined').length || 0;
      const joinRate = totalInvited > 0 ? (joinedCount / totalInvited) * 100 : 0;

      // Calculate average duration from scheduled times or analytics
      let avgDuration = 0;
      if (meetings && meetings.length > 0) {
        const durations = meetings
          .filter(m => m.scheduled_start && m.scheduled_end)
          .map(m => {
            const start = new Date(m.scheduled_start);
            const end = new Date(m.scheduled_end);
            return (end.getTime() - start.getTime()) / (1000 * 60); // Convert to minutes
          })
          .filter(d => d > 0 && d < 480); // Filter out invalid durations (0 or > 8 hours)
        
        if (durations.length > 0) {
          avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        }
      }

      setAnalytics({
        totalMeetings: meetings?.length || 0,
        instantMeetings: instantCount,
        scheduledMeetings: scheduledCount,
        avgParticipants: Math.round(avgParticipants * 10) / 10,
        avgDuration: Math.round(avgDuration),
        totalParticipants,
        creationMethods,
        weeklyTrend: weeklyData,
        invitationMethods,
        joinRate: Math.round(joinRate * 10) / 10,
      });
    } catch (error: any) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMeetings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Badge variant="outline" className="mr-1">
                <Zap className="h-3 w-3 mr-1" />
                {analytics.instantMeetings}
              </Badge>
              instant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgParticipants}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.totalParticipants} total participants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Join Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.joinRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Invitation acceptance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgDuration}m</div>
            <p className="text-xs text-muted-foreground mt-1">
              Minutes per meeting
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Meeting Trend</CardTitle>
            <CardDescription>Last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="meetings" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Creation Methods</CardTitle>
            <CardDescription>How meetings are created</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.creationMethods}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.creationMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {analytics.invitationMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitation Methods</CardTitle>
            <CardDescription>How you invite participants</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.invitationMethods}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
