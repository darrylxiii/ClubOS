import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Settings, Video, Clock, Sparkles, BarChart3 } from "lucide-react";
import { CreateMeetingDialog } from "@/components/meetings/CreateMeetingDialog";
import { MeetingCard } from "@/components/meetings/MeetingCard";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MeetingStatsBar } from "@/components/meetings/MeetingStatsBar";
import { UnifiedCalendarView } from "@/components/meetings/UnifiedCalendarView";
import { MeetingIntelligenceTab } from "@/components/meetings/MeetingIntelligenceTab";
import { NotetakerSettingsTab } from "@/components/meetings/NotetakerSettingsTab";
import { MeetingHistoryTab } from "@/components/meetings/MeetingHistoryTab";
import { InstantMeetingButton } from "@/components/meetings/InstantMeetingButton";
import { MeetingAnalyticsDashboard } from "@/components/meetings/MeetingAnalyticsDashboard";
import { useAutoCreatePMR } from "@/hooks/useAutoCreatePMR";
import { toast } from "sonner";

export default function Meetings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [stats, setStats] = useState({
    upcoming: 0,
    today: 0,
    week: 0,
    analyzed: 0,
    hours: 0,
  });

  const activeTab = searchParams.get('tab') || 'calendar';

  // Auto-create Personal Meeting Room if user doesn't have one
  useAutoCreatePMR();

  // Debug logging for component lifecycle
  useEffect(() => {
    console.log('[Meetings] Component mounted, tab:', activeTab, 'user:', user?.id);
    return () => console.log('[Meetings] Component unmounted');
  }, []);

  useEffect(() => {
    if (user) {
      console.log('[Meetings] Loading data for user:', user.id);
      loadMeetings();
      loadStats();

      const channel = subscribeToMeetings();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadMeetings = async () => {
    try {
      setLoading(true);

      const { data: hostedMeetings, error: hostedError } = await supabase
        .from('meetings')
        .select('*')
        .eq('host_id', user?.id ?? '');

      if (hostedError) throw hostedError;

      const { data: participantMeetings, error: participantError } = await supabase
        .from('meeting_participants')
        .select('meeting_id, meetings(*)')
        .eq('user_id', user?.id ?? '');

      if (participantError) throw participantError;

      const allMeetings = [
        ...(hostedMeetings || []),
        ...(participantMeetings?.map(p => p.meetings).filter(Boolean) || [])
      ];

      const uniqueMeetings = Array.from(
        new Map(allMeetings.map(m => [m.id, m])).values()
      ).sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());

      setMeetings(uniqueMeetings);
    } catch (error: any) {
      console.error('Error loading meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const todayEnd = new Date(now.setHours(23, 59, 59, 999)).toISOString();
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const [upcomingRes, todayRes, weekRes, analyzedRes] = await Promise.all([
        supabase.from('meetings').select('*', { count: 'exact', head: true }).gte('scheduled_start', new Date().toISOString()),
        supabase.from('meetings').select('*', { count: 'exact', head: true }).gte('scheduled_start', todayStart).lte('scheduled_start', todayEnd),
        supabase.from('meetings').select('*', { count: 'exact', head: true }).gte('scheduled_start', todayStart).lte('scheduled_start', weekEnd),
        supabase.from('meeting_insights').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        upcoming: upcomingRes.count || 0,
        today: todayRes.count || 0,
        week: weekRes.count || 0,
        analyzed: analyzedRes.count || 0,
        hours: (analyzedRes.count || 0) * 0.5,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const subscribeToMeetings = () => {
    const channel = supabase
      .channel('meetings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings'
        },
        () => {
          loadMeetings();
          loadStats();
        }
      )
      .subscribe();

    return channel;
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;
      toast.success('Meeting deleted successfully');
      loadMeetings();
    } catch (error: any) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete meeting');
    }
  };

  const filterMeetings = (type: string) => {
    const now = new Date();
    let filtered = meetings;

    switch (type) {
      case 'my-meetings':
        filtered = meetings.filter(m => m.host_id === user?.id);
        break;
    }

    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const myMeetings = filterMeetings('my-meetings');

  const setActiveTabValue = (value: string) => {
    // Use replace to avoid creating new history entries and prevent remounting
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Meetings & Intelligence</h1>
            <p className="text-muted-foreground">
              Unified hub for all your meetings, calendar, and AI insights
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/settings?tab=integrations')}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Integrations
            </Button>
            <InstantMeetingButton />
            <CreateMeetingDialog onMeetingCreated={loadMeetings} />
          </div>
        </div>

        <MeetingStatsBar
          upcomingCount={stats.upcoming}
          todayCount={stats.today}
          weekCount={stats.week}
          analyzedCount={stats.analyzed}
          hoursTranscribed={stats.hours}
        />

        <Tabs key={activeTab} value={activeTab} onValueChange={setActiveTabValue}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="my-meetings" className="gap-2">
              <Video className="h-4 w-4" />
              My Meetings
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Intelligence
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-6">
            <UnifiedCalendarView />
          </TabsContent>

          <TabsContent value="my-meetings" className="mt-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search meetings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ) : myMeetings.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">You haven't hosted any meetings yet</p>
                </Card>
              ) : (
                myMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onDelete={handleDeleteMeeting}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <MeetingHistoryTab />
          </TabsContent>

          <TabsContent value="intelligence" className="mt-6">
            <MeetingIntelligenceTab />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <MeetingAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <NotetakerSettingsTab />
          </TabsContent>
        </Tabs>

      </div>
    </>
  );
}
