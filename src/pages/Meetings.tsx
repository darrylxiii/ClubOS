import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { CreateMeetingDialog } from '@/components/meetings/CreateMeetingDialog';
import { MeetingCard } from '@/components/meetings/MeetingCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Calendar, Clock, Video, Users, Bot } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Meetings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    if (user) {
      loadMeetings();
      subscribeToMeetings();
    }
  }, [user]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      
      // Get meetings where user is host
      const { data: hostedMeetings, error: hostedError } = await supabase
        .from('meetings')
        .select('*')
        .eq('host_id', user?.id);

      if (hostedError) throw hostedError;

      // Get meetings where user is participant
      const { data: participantMeetings, error: participantError } = await supabase
        .from('meeting_participants')
        .select('meeting_id, meetings(*)')
        .eq('user_id', user?.id);

      if (participantError) throw participantError;

      // Combine and deduplicate meetings
      const allMeetings = [
        ...(hostedMeetings || []),
        ...(participantMeetings?.map(p => p.meetings).filter(Boolean) || [])
      ];

      // Remove duplicates by id
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

  const subscribeToMeetings = () => {
    const channel = supabase
      .channel('meetings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings',
        },
        () => {
          loadMeetings();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
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

  const filterMeetings = (meetings: any[], type: string) => {
    const now = new Date();
    let filtered = meetings;

    switch (type) {
      case 'upcoming':
        filtered = meetings.filter(m => new Date(m.scheduled_start) > now && m.status !== 'cancelled');
        break;
      case 'past':
        filtered = meetings.filter(m => new Date(m.scheduled_end) < now);
        break;
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

  const upcomingMeetings = filterMeetings(meetings, 'upcoming');
  const pastMeetings = filterMeetings(meetings, 'past');
  const myMeetings = filterMeetings(meetings, 'my-meetings');

  const stats = [
    {
      label: 'Upcoming',
      value: upcomingMeetings.length,
      icon: Calendar,
      color: 'text-blue-500'
    },
    {
      label: 'Total Hosted',
      value: myMeetings.length,
      icon: Video,
      color: 'text-purple-500'
    },
    {
      label: 'Past Meetings',
      value: pastMeetings.length,
      icon: Clock,
      color: 'text-gray-500'
    }
  ];

  return (
    <AppLayout>
      <div className="container mx-auto p-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Meetings</h1>
            <p className="text-muted-foreground">
              Schedule, join, and manage your Quantum Club meetings
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/meeting-intelligence')}
              className="gap-2"
            >
              <Bot className="h-4 w-4" />
              Meeting Intelligence
            </Button>
            <CreateMeetingDialog onMeetingCreated={loadMeetings} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="my-meetings">My Meetings</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-32 w-full" />
                </Card>
              ))
            ) : upcomingMeetings.length === 0 ? (
              <Card className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No upcoming meetings</h3>
                <p className="text-muted-foreground mb-4">
                  Schedule your first meeting to get started
                </p>
                <CreateMeetingDialog
                  trigger={<Button>Schedule Meeting</Button>}
                  onMeetingCreated={loadMeetings}
                />
              </Card>
            ) : (
              upcomingMeetings.map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onDelete={meeting.host_id === user?.id ? handleDeleteMeeting : undefined}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="my-meetings" className="space-y-4">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-32 w-full" />
                </Card>
              ))
            ) : myMeetings.length === 0 ? (
              <Card className="p-12 text-center">
                <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No meetings hosted</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first meeting to get started
                </p>
                <CreateMeetingDialog
                  trigger={<Button>Create Meeting</Button>}
                  onMeetingCreated={loadMeetings}
                />
              </Card>
            ) : (
              myMeetings.map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onDelete={handleDeleteMeeting}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-32 w-full" />
                </Card>
              ))
            ) : pastMeetings.length === 0 ? (
              <Card className="p-12 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No past meetings</h3>
                <p className="text-muted-foreground">
                  Your meeting history will appear here
                </p>
              </Card>
            ) : (
              pastMeetings.map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}