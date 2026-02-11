import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface MeetingStats {
  activeMeetings: number;
  totalParticipants: number;
  todayMeetings: number;
}

export const ActiveMeetingsWidget = () => {
  const [stats, setStats] = useState<MeetingStats>({
    activeMeetings: 0,
    totalParticipants: 0,
    todayMeetings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetingStats();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('active-meetings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
        fetchMeetingStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMeetingStats = async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      // Get active meetings (in progress)
      const { data: activeMeetings } = await supabase
        .from('meetings')
        .select('id')
        .eq('status', 'in_progress');

      // Get participants in active meetings
      const { data: participants } = await supabase
        .from('meeting_participants')
        .select('id, meeting_id')
        .is('left_at', null);

      // Get today's scheduled meetings
      const { data: todayMeetings } = await supabase
        .from('meetings')
        .select('id')
        .gte('scheduled_start', startOfDay.toISOString())
        .lt('scheduled_start', new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000).toISOString());

      setStats({
        activeMeetings: activeMeetings?.length || 0,
        totalParticipants: participants?.length || 0,
        todayMeetings: todayMeetings?.length || 0
      });
    } catch (error) {
      console.error('Error fetching meeting stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-subtle rounded-2xl">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-subtle rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="h-5 w-5 text-primary" />
          Meetings
          {stats.activeMeetings > 0 && (
            <Badge variant="default" className="ml-auto bg-green-500 animate-pulse">
              {stats.activeMeetings} live
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex flex-col items-center p-2 rounded-lg bg-green-500/10">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xl font-bold text-green-500">{stats.activeMeetings}</span>
            </div>
            <span className="text-xs text-muted-foreground">Active Now</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-primary/10">
            <span className="text-xl font-bold text-primary">{stats.totalParticipants}</span>
            <span className="text-xs text-muted-foreground">In Calls</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <span className="text-xl font-bold">{stats.todayMeetings}</span>
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/meetings">
            <ArrowRight className="h-4 w-4 mr-2" />
            View All Meetings
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
