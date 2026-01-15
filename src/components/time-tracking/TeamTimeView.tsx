import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Clock, BarChart3 } from "lucide-react";
import { secondsToHours } from "@/hooks/useTimeTracking";
import { format, startOfWeek, endOfWeek } from "date-fns";

export function TeamTimeView() {
  const { user } = useAuth();

  // Get user's company
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch team time data
  const { data: teamStats } = useQuery({
    queryKey: ['team-time-stats', userProfile?.company_id],
    queryFn: async () => {
      if (!userProfile?.company_id) return null;

      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      // Get all team members' time entries for this week
      const { data: entries, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          user_id,
          duration_seconds,
          is_billable,
          activity_level,
          start_time
        `)
        .eq('company_id', userProfile.company_id)
        .not('end_time', 'is', null)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString());

      if (error) throw error;

      // Get team member profiles
      const userIds = [...new Set(entries?.map(e => e.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      // Aggregate by user
      const userMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const userStats = entries?.reduce((acc, e) => {
        if (!acc[e.user_id]) {
          const profile = userMap.get(e.user_id);
          acc[e.user_id] = {
            userId: e.user_id,
            name: profile?.full_name || 'Unknown',
            avatar: profile?.avatar_url,
            totalSeconds: 0,
            billableSeconds: 0,
            activitySum: 0,
            activityCount: 0,
          };
        }
        acc[e.user_id].totalSeconds += e.duration_seconds || 0;
        if (e.is_billable) {
          acc[e.user_id].billableSeconds += e.duration_seconds || 0;
        }
        const activityNum = parseInt(e.activity_level || '0');
        if (!isNaN(activityNum)) {
          acc[e.user_id].activitySum += activityNum;
          acc[e.user_id].activityCount += 1;
        }
        return acc;
      }, {} as Record<string, any>);

      const teamMembers = Object.values(userStats || {}).map((u: any) => ({
        ...u,
        totalHours: secondsToHours(u.totalSeconds),
        billableHours: secondsToHours(u.billableSeconds),
        avgActivity: u.activityCount > 0 ? Math.round(u.activitySum / u.activityCount) : 0,
      })).sort((a, b) => b.totalHours - a.totalHours);

      const totalHours = teamMembers.reduce((sum, m) => sum + m.totalHours, 0);
      const totalBillableHours = teamMembers.reduce((sum, m) => sum + m.billableHours, 0);
      const avgActivity = teamMembers.length > 0 
        ? Math.round(teamMembers.reduce((sum, m) => sum + m.avgActivity, 0) / teamMembers.length)
        : 0;

      return {
        teamMembers,
        totalHours,
        totalBillableHours,
        avgActivity,
        weekRange: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
      };
    },
    enabled: !!userProfile?.company_id,
  });

  if (!userProfile?.company_id) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No company assigned</p>
          <p className="text-sm text-muted-foreground mt-1">
            Team time tracking requires company membership
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Overview */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Team Overview
          </CardTitle>
          <CardDescription>{teamStats?.weekRange || 'This Week'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{(teamStats?.totalHours || 0).toFixed(1)}h</p>
              <p className="text-sm text-muted-foreground">Total Hours</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{(teamStats?.totalBillableHours || 0).toFixed(1)}h</p>
              <p className="text-sm text-muted-foreground">Billable</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{teamStats?.avgActivity || 0}%</p>
              <p className="text-sm text-muted-foreground">Avg Activity</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>Individual time tracked this week</CardDescription>
        </CardHeader>
        <CardContent>
          {!teamStats?.teamMembers?.length ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No time entries this week</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamStats.teamMembers.map((member) => (
                <div key={member.userId} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar || undefined} />
                    <AvatarFallback>{member.name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-muted-foreground">
                        {member.totalHours.toFixed(1)}h total
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {member.billableHours.toFixed(1)}h billable
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-medium">{member.avgActivity}%</p>
                      <p className="text-xs text-muted-foreground">Activity</p>
                    </div>
                    <Badge 
                      variant={member.avgActivity >= 60 ? "default" : member.avgActivity >= 30 ? "secondary" : "outline"}
                      className={member.avgActivity >= 60 ? "bg-green-500" : member.avgActivity >= 30 ? "bg-yellow-500" : ""}
                    >
                      {member.avgActivity >= 60 ? 'High' : member.avgActivity >= 30 ? 'Medium' : 'Low'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}