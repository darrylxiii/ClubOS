import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Activity, TrendingUp, Download, Search } from "lucide-react";
import { subDays, format, formatDistanceToNow } from "date-fns";

interface RecruiterStats {
  recruiter_id: string;
  recruiter_name: string;
  avatar_url: string | null;
  sourced: number;
  screened: number;
  interviewed: number;
  offered: number;
  placed: number;
  total_activities: number;
  conversionRate: number;
}

function useRecruiterActivityData(days: number) {
  return useQuery({
    queryKey: ['recruiter-activity-data', days],
    queryFn: async () => {
      const since = subDays(new Date(), days).toISOString();

      const [logRes, profileRes] = await Promise.all([
        supabase
          .from('recruiter_activity_log')
          .select('*')
          .gte('created_at', since)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .limit(500),
      ]);

      if (logRes.error) throw logRes.error;
      if (profileRes.error) throw profileRes.error;

      const activityLog = logRes.data || [];
      const profiles = profileRes.data || [];
      const profileMap = new Map(profiles.map(p => [p.id, p]));

      // Aggregate stats
      const map: Record<string, { sourced: number; screened: number; interviewed: number; offered: number; placed: number; total: number }> = {};

      activityLog.forEach(a => {
        if (!map[a.recruiter_id]) map[a.recruiter_id] = { sourced: 0, screened: 0, interviewed: 0, offered: 0, placed: 0, total: 0 };
        const r = map[a.recruiter_id];
        r.total++;
        if (a.activity_type === 'candidate_sourced') r.sourced++;
        else if (a.activity_type === 'candidate_screened') r.screened++;
        else if (a.activity_type === 'interview_conducted') r.interviewed++;
        else if (a.activity_type === 'offer_sent') r.offered++;
        else if (a.activity_type === 'placement_made') r.placed++;
      });

      const stats: RecruiterStats[] = Object.entries(map)
        .map(([recruiter_id, s]) => {
          const profile = profileMap.get(recruiter_id);
          return {
            recruiter_id,
            recruiter_name: profile?.full_name || recruiter_id.slice(0, 8),
            avatar_url: profile?.avatar_url || null,
            ...s,
            total_activities: s.total,
            conversionRate: s.sourced > 0 ? Math.round((s.placed / s.sourced) * 100) : 0,
          };
        })
        .sort((a, b) => b.total_activities - a.total_activities);

      return { stats, activityLog, profileMap };
    },
    staleTime: 30000,
  });
}

export function RecruiterProductivityPanel() {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading } = useRecruiterActivityData(days);

  const stats = data?.stats || [];
  const activityLog = data?.activityLog || [];
  const profileMap = data?.profileMap || new Map();

  const filtered = searchQuery.trim()
    ? stats.filter(r => r.recruiter_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : stats;

  const totalActivities = activityLog.length;
  const totalPlacements = stats.reduce((a, r) => a + r.placed, 0);
  const avgConversion = stats.length > 0 ? Math.round(stats.reduce((a, r) => a + r.conversionRate, 0) / stats.length) : 0;
  const topRecruiter = stats[0];

  const exportCSV = () => {
    const headers = "Rank,Recruiter,Sourced,Screened,Interviewed,Offered,Placed,Conversion Rate,Total Activities\n";
    const rows = filtered.map((r, i) =>
      `${i + 1},"${r.recruiter_name}",${r.sourced},${r.screened},${r.interviewed},${r.offered},${r.placed},${r.conversionRate}%,${r.total_activities}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recruiter-productivity-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Activity tracking and conversion metrics</p>
        <div className="flex gap-2">
          <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={isLoading || filtered.length === 0}>
            <Download className="h-4 w-4 mr-1" />CSV
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Activities</p><p className="text-2xl font-bold">{totalActivities}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Placements</p><p className="text-2xl font-bold text-green-600">{totalPlacements}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Avg Conversion</p><p className="text-2xl font-bold">{avgConversion}%</p></CardContent></Card>
          <Card className="border-amber-500/30"><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Top Recruiter</p><p className="text-lg font-bold flex items-center gap-1.5"><Trophy className="h-4 w-4 text-amber-500" />{topRecruiter?.recruiter_name || "\u2014"}</p></CardContent></Card>
        </div>
      )}

      {/* Leaderboard + Activity */}
      <Tabs defaultValue="leaderboard">
        <TabsList>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recruiter Leaderboard</CardTitle>
                  <CardDescription>Ranked by total activity volume</CardDescription>
                </div>
                <div className="relative w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 h-8 text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">
                  {searchQuery.trim() ? `No recruiters matching "${searchQuery}".` : "No activity data yet."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Recruiter</TableHead>
                      <TableHead>Sourced</TableHead>
                      <TableHead>Screened</TableHead>
                      <TableHead>Interviewed</TableHead>
                      <TableHead>Offered</TableHead>
                      <TableHead>Placed</TableHead>
                      <TableHead>Conversion</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r, i) => {
                      const globalRank = stats.findIndex(s => s.recruiter_id === r.recruiter_id);
                      return (
                        <TableRow key={r.recruiter_id}>
                          <TableCell>
                            {globalRank === 0 ? <Badge className="bg-amber-500">1st</Badge> :
                             globalRank === 1 ? <Badge variant="secondary">2nd</Badge> :
                             globalRank === 2 ? <Badge variant="outline">3rd</Badge> :
                             <span className="text-muted-foreground">{globalRank + 1}</span>}
                          </TableCell>
                          <TableCell>
                            <button
                              className="font-medium hover:text-primary hover:underline transition-colors text-left"
                              onClick={() => navigate(`/admin/employees/${r.recruiter_id}`)}
                            >
                              {r.recruiter_name}
                            </button>
                          </TableCell>
                          <TableCell>{r.sourced}</TableCell>
                          <TableCell>{r.screened}</TableCell>
                          <TableCell>{r.interviewed}</TableCell>
                          <TableCell>{r.offered}</TableCell>
                          <TableCell><Badge variant={r.placed > 0 ? "default" : "secondary"}>{r.placed}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className={r.conversionRate > avgConversion ? "text-green-600 font-medium" : ""}>{r.conversionRate}%</span>
                              {r.conversionRate > avgConversion && <TrendingUp className="h-3 w-3 text-green-600" />}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{r.total_activities}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Funnel */}
          {stats.length > 0 && !isLoading && (
            <Card>
              <CardHeader><CardTitle className="text-base">Aggregate Funnel</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(["sourced", "screened", "interviewed", "offered", "placed"] as const).map(stage => {
                    const total = stats.reduce((a, r) => a + r[stage], 0);
                    const maxVal = Math.max(stats.reduce((a, r) => a + r.sourced, 0), 1);
                    const pct = (total / maxVal) * 100;
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <span className="w-24 text-sm font-medium capitalize">{stage}</span>
                        <div className="flex-1 bg-muted rounded-full h-3.5">
                          <div className="bg-primary rounded-full h-3.5 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-12 text-sm font-mono text-right">{total}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Latest recruiter interactions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : activityLog.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">No recent activity.</p>
              ) : (
                <div className="space-y-2">
                  {activityLog.slice(0, 50).map((a: { id: string; recruiter_id: string; activity_type: string; entity_type: string; created_at: string }) => {
                    const profile = profileMap.get(a.recruiter_id);
                    return (
                      <div key={a.id} className="flex items-center gap-3 p-3 border rounded text-sm">
                        <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                        <button
                          className="font-medium hover:text-primary hover:underline transition-colors"
                          onClick={() => navigate(`/admin/employees/${a.recruiter_id}`)}
                        >
                          {profile?.full_name || a.recruiter_id?.slice(0, 8)}
                        </button>
                        <Badge variant="outline">{a.activity_type}</Badge>
                        <span className="text-muted-foreground">{a.entity_type}</span>
                        <span className="ml-auto text-xs text-muted-foreground" title={new Date(a.created_at).toLocaleString()}>
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
