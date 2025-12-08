import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Users, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_hours: number;
  billable_hours: number;
  entries_count: number;
}

type DateRange = "today" | "week" | "month";

export function TeamTimeOverview() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>("week");

  // Get user's company
  const { data: userCompany } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data?.company_id || null;
    },
    enabled: !!user?.id,
  });

  // Fetch team members and their time data
  const { data: teamData, isLoading } = useQuery({
    queryKey: ["team-time-overview", userCompany, dateRange],
    queryFn: async () => {
      if (!userCompany) return [];

      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      switch (dateRange) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case "month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
      }

      // Get team members
      const { data: members } = await supabase
        .from("company_members")
        .select("user_id")
        .eq("company_id", userCompany);

      if (!members?.length) return [];

      const memberIds = members.map((m) => m.user_id).filter(Boolean);

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", memberIds);

      // Get time entries
      const { data: entries } = await supabase
        .from("time_entries")
        .select("user_id, duration_seconds, is_billable")
        .in("user_id", memberIds)
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString())
        .eq("is_running", false);

      // Aggregate
      const statsMap = new Map<string, { total: number; billable: number; count: number }>();
      entries?.forEach((e) => {
        if (!e.user_id) return;
        const curr = statsMap.get(e.user_id) || { total: 0, billable: 0, count: 0 };
        curr.total += e.duration_seconds || 0;
        if (e.is_billable) curr.billable += e.duration_seconds || 0;
        curr.count += 1;
        statsMap.set(e.user_id, curr);
      });

      return memberIds.map((id) => {
        const profile = profiles?.find((p) => p.id === id);
        const stats = statsMap.get(id) || { total: 0, billable: 0, count: 0 };
        return {
          id,
          full_name: profile?.full_name || "Unknown",
          avatar_url: profile?.avatar_url,
          total_hours: Math.round((stats.total / 3600) * 10) / 10,
          billable_hours: Math.round((stats.billable / 3600) * 10) / 10,
          entries_count: stats.count,
        } as TeamMember;
      }).sort((a, b) => b.total_hours - a.total_hours);
    },
    enabled: !!userCompany,
  });

  const totalTeamHours = teamData?.reduce((sum, m) => sum + m.total_hours, 0) || 0;
  const totalBillable = teamData?.reduce((sum, m) => sum + m.billable_hours, 0) || 0;
  const billablePercentage = totalTeamHours > 0 ? Math.round((totalBillable / totalTeamHours) * 100) : 0;

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!userCompany) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No Team Found</h3>
          <p className="text-sm text-muted-foreground mt-1">You need to be part of a company to view team data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Team Members</p><p className="text-2xl font-bold">{teamData?.length || 0}</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><Clock className="h-5 w-5 text-green-500" /></div>
            <div><p className="text-sm text-muted-foreground">Total Hours</p><p className="text-2xl font-bold">{totalTeamHours.toFixed(1)}h</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><TrendingUp className="h-5 w-5 text-amber-500" /></div>
            <div><p className="text-sm text-muted-foreground">Billable %</p><p className="text-2xl font-bold">{billablePercentage}%</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Team List */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Team Activity</CardTitle>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {!teamData?.length ? (
            <div className="text-center py-8 text-muted-foreground">No time tracked by team members</div>
          ) : (
            <div className="space-y-3">
              {teamData.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>{member.full_name?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.full_name}</p>
                      <p className="text-sm text-muted-foreground">{member.entries_count} entries</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold">{member.total_hours.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">{member.billable_hours.toFixed(1)}h billable</p>
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
