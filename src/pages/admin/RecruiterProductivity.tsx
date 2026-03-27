import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Trophy, Activity, TrendingUp, Target, BarChart3, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { subDays, format, formatDistanceToNow } from "date-fns";

interface RecruiterStats {
  recruiter_id: string;
  recruiter_name: string;
  sourced: number;
  screened: number;
  interviewed: number;
  offered: number;
  placed: number;
  total_activities: number;
  conversionRate: number;
}

export default function RecruiterProductivity() {
  const { t } = useTranslation('admin');
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { fetchData(); }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    const since = subDays(new Date(), parseInt(dateRange)).toISOString();
    const [logRes, profileRes] = await Promise.all([
      supabase.from("recruiter_activity_log").select("*").gte("created_at", since).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, avatar_url").limit(500),
    ]);
    if (logRes.error) { toast.error('Failed to load activity log'); console.error(logRes.error); }
    if (profileRes.error) { toast.error('Failed to load profiles'); console.error(profileRes.error); }
    if (logRes.data) setActivityLog(logRes.data);
    if (profileRes.data) setProfiles(profileRes.data);
    setLoading(false);
  };

  const getName = (id: string) => profiles.find(p => p.id === id)?.full_name || id?.slice(0, 8) || "Unknown";

  const recruiterStats: RecruiterStats[] = (() => {
    const map: Record<string, { sourced: number; screened: number; interviewed: number; offered: number; placed: number; total: number }> = {};
    activityLog.forEach(a => {
      if (!map[a.recruiter_id]) map[a.recruiter_id] = { sourced: 0, screened: 0, interviewed: 0, offered: 0, placed: 0, total: 0 };
      const r = map[a.recruiter_id];
      r.total++;
      if (a.activity_type === "candidate_sourced") r.sourced++;
      else if (a.activity_type === "candidate_screened") r.screened++;
      else if (a.activity_type === "interview_conducted") r.interviewed++;
      else if (a.activity_type === "offer_sent") r.offered++;
      else if (a.activity_type === "placement_made") r.placed++;
    });
    return Object.entries(map)
      .map(([recruiter_id, s]) => ({
        recruiter_id,
        recruiter_name: getName(recruiter_id),
        ...s,
        total_activities: s.total,
        conversionRate: s.sourced > 0 ? Math.round((s.placed / s.sourced) * 100) : 0,
      }))
      .sort((a, b) => b.total_activities - a.total_activities);
  })();

  const filteredStats = searchQuery.trim()
    ? recruiterStats.filter(r => r.recruiter_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : recruiterStats;

  const totalActivities = activityLog.length;
  const totalPlacements = recruiterStats.reduce((a, r) => a + r.placed, 0);
  const avgConversion = recruiterStats.length > 0 ? Math.round(recruiterStats.reduce((a, r) => a + r.conversionRate, 0) / recruiterStats.length) : 0;
  const topRecruiter = recruiterStats[0];

  const recentActivity = activityLog.slice(0, 50);

  const exportCSV = () => {
    const headers = "Rank,Recruiter,Sourced,Screened,Interviewed,Offered,Placed,Conversion Rate,Total Activities\n";
    const rows = filteredStats.map((r, i) =>
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

  const SkeletonCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );

  const SkeletonTable = () => (
    <div className="space-y-3 py-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-10" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
      ))}
    </div>
  );

  const SkeletonActivityFeed = () => (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28 ml-auto" />
        </div>
      ))}
    </div>
  );

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{'RECRUITER PRODUCTIVITY'}</h1>
            </div>
            <p className="text-muted-foreground">{'Leaderboard, activity tracking, and conversion metrics'}</p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{"Last 7 days"}</SelectItem>
                <SelectItem value="30">{"Last 30 days"}</SelectItem>
                <SelectItem value="90">{"Last 90 days"}</SelectItem>
                <SelectItem value="365">{'Last year'}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV} disabled={loading || filteredStats.length === 0}>
              <Download className="h-4 w-4 mr-2" />{'Export CSV'}</Button>
          </div>
        </div>

        {loading ? <SkeletonCards /> : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardDescription>{'Total Activities'}</CardDescription><CardTitle className="text-2xl">{totalActivities}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{'Total Placements'}</CardDescription><CardTitle className="text-2xl text-green-600">{totalPlacements}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{'Avg Conversion'}</CardDescription><CardTitle className="text-2xl">{avgConversion}%</CardTitle></CardHeader></Card>
            <Card className="border-amber-500/50"><CardHeader className="pb-2"><CardDescription>{'Top Recruiter'}</CardDescription><CardTitle className="text-lg flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" />{topRecruiter?.recruiter_name || "\u2014"}</CardTitle></CardHeader></Card>
          </div>
        )}

        <Tabs defaultValue="leaderboard">
          <TabsList>
            <TabsTrigger value="leaderboard">{"Leaderboard"}</TabsTrigger>
            <TabsTrigger value="activity">{'Activity Feed'}</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{'Recruiter Leaderboard'}</CardTitle>
                    <CardDescription>{'Performance ranked by total activity volume'}</CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={'Search by recruiter name...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <SkeletonTable /> : filteredStats.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">
                    {searchQuery.trim()
                      ? `No recruiters matching "${searchQuery}".`
                      : "No recruiter activity data yet. Data populates as recruiters interact with candidates."}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{"Rank"}</TableHead>
                        <TableHead>{"Recruiter"}</TableHead>
                        <TableHead>{"Sourced"}</TableHead>
                        <TableHead>{"Screened"}</TableHead>
                        <TableHead>{"Interviewed"}</TableHead>
                        <TableHead>{"Offered"}</TableHead>
                        <TableHead>{"Placed"}</TableHead>
                        <TableHead>{"Conversion"}</TableHead>
                        <TableHead>{"Total"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStats.map((r, i) => {
                        const globalRank = recruiterStats.findIndex(s => s.recruiter_id === r.recruiter_id);
                        return (
                          <TableRow key={r.recruiter_id}>
                            <TableCell>
                              {globalRank === 0 ? <Badge className="bg-amber-500">{"1st"}</Badge> :
                               globalRank === 1 ? <Badge variant="secondary">{"2nd"}</Badge> :
                               globalRank === 2 ? <Badge variant="outline">{"3rd"}</Badge> :
                               <span className="text-muted-foreground">{globalRank + 1}</span>}
                            </TableCell>
                            <TableCell className="font-medium">{r.recruiter_name}</TableCell>
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

            {/* Funnel visualization */}
            {recruiterStats.length > 0 && !loading && (
              <Card>
                <CardHeader><CardTitle>{'Aggregate Funnel'}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {["sourced", "screened", "interviewed", "offered", "placed"].map(stage => {
                      const total = recruiterStats.reduce((a, r) => a + (r as any)[stage], 0);
                      const maxVal = Math.max(recruiterStats.reduce((a, r) => a + r.sourced, 0), 1);
                      const pct = (total / maxVal) * 100;
                      return (
                        <div key={stage} className="flex items-center gap-3">
                          <span className="w-24 text-sm font-medium capitalize">{stage}</span>
                          <div className="flex-1 bg-muted rounded-full h-4">
                            <div className="bg-primary rounded-full h-4 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-16 text-sm font-mono text-right">{total}</span>
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
              <CardHeader><CardTitle>{'Recent Activity'}</CardTitle><CardDescription>{'Latest recruiter interactions'}</CardDescription></CardHeader>
              <CardContent>
                {loading ? <SkeletonActivityFeed /> : recentActivity.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">{'No recent activity.'}</p>
                ) : (
                  <div className="space-y-2">
                    {recentActivity.map(a => (
                      <div key={a.id} className="flex items-center gap-3 p-3 border rounded text-sm">
                        <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{getName(a.recruiter_id)}</span>
                        <Badge variant="outline">{a.activity_type}</Badge>
                        <span className="text-muted-foreground">{a.entity_type}</span>
                        <span className="ml-auto text-xs text-muted-foreground" title={new Date(a.created_at).toLocaleString()}>
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
