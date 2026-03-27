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
import { MailOpen, Send, MousePointer, AlertTriangle, TrendingUp, BarChart3, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { subDays, format, formatDistanceToNow } from "date-fns";

interface TrackingEvent {
  id: string;
  message_id: string;
  event_type: string;
  recipient_email: string;
  link_url: string;
  user_agent: string;
  created_at: string;
}

export default function EmailTrackingAnalytics() {
  const { t } = useTranslation('admin');
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { fetchEvents(); }, [dateRange]);

  const fetchEvents = async () => {
    setLoading(true);
    const since = subDays(new Date(), parseInt(dateRange)).toISOString();
    const { data, error } = await supabase.from("email_tracking_events").select("*").gte("created_at", since).order("created_at", { ascending: false });
    if (error) { toast.error('Failed to load email tracking data'); console.error(error); }
    if (data) setEvents(data);
    setLoading(false);
  };

  const sent = events.filter(e => e.event_type === "sent").length;
  const delivered = events.filter(e => e.event_type === "delivered").length;
  const opened = events.filter(e => e.event_type === "opened").length;
  const clicked = events.filter(e => e.event_type === "clicked").length;
  const bounced = events.filter(e => e.event_type === "bounced").length;

  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
  const clickRate = opened > 0 ? Math.round((clicked / opened) * 100) : 0;
  const bounceRate = sent > 0 ? Math.round((bounced / sent) * 100) : 0;
  const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;

  // Per-message aggregation
  const messageStats = (() => {
    const map: Record<string, { sent: boolean; delivered: boolean; opened: number; clicked: number; bounced: boolean; recipient: string }> = {};
    events.forEach(e => {
      if (!map[e.message_id]) map[e.message_id] = { sent: false, delivered: false, opened: 0, clicked: 0, bounced: false, recipient: e.recipient_email };
      const m = map[e.message_id];
      if (e.event_type === "sent") m.sent = true;
      if (e.event_type === "delivered") m.delivered = true;
      if (e.event_type === "opened") m.opened++;
      if (e.event_type === "clicked") m.clicked++;
      if (e.event_type === "bounced") m.bounced = true;
    });
    return Object.entries(map)
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.opened - a.opened);
  })();

  const filteredMessageStats = searchQuery.trim()
    ? messageStats.filter(m => m.recipient.toLowerCase().includes(searchQuery.toLowerCase()))
    : messageStats;

  // Link click tracking
  const linkClicks = (() => {
    const map: Record<string, number> = {};
    events.filter(e => e.event_type === "clicked" && e.link_url).forEach(e => {
      map[e.link_url] = (map[e.link_url] || 0) + 1;
    });
    return Object.entries(map)
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count);
  })();

  const exportCSV = () => {
    const headers = "Message ID,Recipient,Delivered,Opens,Clicks,Bounced,Status\n";
    const rows = filteredMessageStats.map(m => {
      const status = m.bounced ? "Bounced" : m.clicked > 0 ? "Engaged" : m.opened > 0 ? "Opened" : m.delivered ? "Delivered" : "Sent";
      return `"${m.id}","${m.recipient}",${m.delivered ? "Yes" : "No"},${m.opened},${m.clicked},${m.bounced ? "Yes" : "No"},"${status}"`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-tracking-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SkeletonCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-14" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );

  const SkeletonFunnel = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const SkeletonTable = () => (
    <div className="space-y-3 py-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );

  const SkeletonEventFeed = () => (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 border rounded">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-40" />
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
              <MailOpen className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{'EMAIL TRACKING ANALYTICS'}</h1>
            </div>
            <p className="text-muted-foreground">{'Open rates, click-through rates, bounce analysis, and deliverability'}</p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t('emailTrackingAnalytics.text1')}</SelectItem>
                <SelectItem value="30">{t('emailTrackingAnalytics.text2')}</SelectItem>
                <SelectItem value="90">{t('emailTrackingAnalytics.text3')}</SelectItem>
                <SelectItem value="365">{'Last year'}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV} disabled={loading || filteredMessageStats.length === 0}>
              <Download className="h-4 w-4 mr-2" />{'Export CSV'}</Button>
          </div>
        </div>

        {loading ? <SkeletonCards /> : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card><CardHeader className="pb-2"><CardDescription>{t('emailTrackingAnalytics.text4')}</CardDescription><CardTitle className="text-2xl">{sent}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{'Open Rate'}</CardDescription><CardTitle className="text-2xl text-green-600">{openRate}%</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{'Click Rate'}</CardDescription><CardTitle className="text-2xl text-blue-600">{clickRate}%</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{'Delivery Rate'}</CardDescription><CardTitle className="text-2xl">{deliveryRate}%</CardTitle></CardHeader></Card>
            <Card className={bounceRate > 5 ? "border-red-500/50" : ""}><CardHeader className="pb-2"><CardDescription>{'Bounce Rate'}</CardDescription><CardTitle className="text-2xl text-red-600">{bounceRate}%</CardTitle></CardHeader></Card>
          </div>
        )}

        {/* Funnel visualization */}
        {loading ? <SkeletonFunnel /> : (
          <Card>
            <CardHeader><CardTitle>{'Email Funnel'}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "Sent", count: sent, color: "bg-slate-500" },
                  { label: "Delivered", count: delivered, color: "bg-blue-500" },
                  { label: "Opened", count: opened, color: "bg-green-500" },
                  { label: "Clicked", count: clicked, color: "bg-purple-500" },
                ].map(step => {
                  const pct = sent > 0 ? (step.count / sent) * 100 : 0;
                  return (
                    <div key={step.label} className="flex items-center gap-3">
                      <span className="w-20 text-sm font-medium">{step.label}</span>
                      <div className="flex-1 bg-muted rounded-full h-4">
                        <div className={`${step.color} rounded-full h-4`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-20 text-sm font-mono text-right">{step.count} ({Math.round(pct)}%)</span>
                    </div>
                  );
                })}
                {bounced > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="w-20 text-sm font-medium text-red-600">{t('emailTrackingAnalytics.text5')}</span>
                    <div className="flex-1 bg-muted rounded-full h-4">
                      <div className="bg-red-500 rounded-full h-4" style={{ width: `${(bounced / sent) * 100}%` }} />
                    </div>
                    <span className="w-20 text-sm font-mono text-right text-red-600">{bounced} ({bounceRate}%)</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="messages">
          <TabsList>
            <TabsTrigger value="messages">{'Per-Message Stats'}</TabsTrigger>
            <TabsTrigger value="links">{'Link Clicks'}</TabsTrigger>
            <TabsTrigger value="recent">{'Recent Events'}</TabsTrigger>
          </TabsList>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{'Per-Message Statistics'}</CardTitle>
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={'Search by recipient email...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <SkeletonTable /> : filteredMessageStats.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">
                    {searchQuery.trim()
                      ? `No messages matching "${searchQuery}".`
                      : "No email tracking data yet. Events populate as emails are sent and tracked."}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{'Message ID'}</TableHead>
                        <TableHead>{t('emailTrackingAnalytics.text6')}</TableHead>
                        <TableHead>{t('emailTrackingAnalytics.text7')}</TableHead>
                        <TableHead>{t('emailTrackingAnalytics.text8')}</TableHead>
                        <TableHead>{t('emailTrackingAnalytics.text9')}</TableHead>
                        <TableHead>{t('emailTrackingAnalytics.text10')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMessageStats.slice(0, 50).map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-xs">{m.id.slice(0, 12)}...</TableCell>
                          <TableCell>{m.recipient}</TableCell>
                          <TableCell>{m.delivered ? <Badge className="bg-green-600">{t('emailTrackingAnalytics.text11')}</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                          <TableCell>{m.opened}</TableCell>
                          <TableCell>{m.clicked}</TableCell>
                          <TableCell>
                            {m.bounced ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{t('emailTrackingAnalytics.text12')}</Badge> :
                             m.clicked > 0 ? <Badge className="bg-purple-600">{t('emailTrackingAnalytics.text13')}</Badge> :
                             m.opened > 0 ? <Badge className="bg-green-600">{t('emailTrackingAnalytics.text14')}</Badge> :
                             m.delivered ? <Badge variant="secondary">{t('emailTrackingAnalytics.text15')}</Badge> :
                             <Badge variant="outline">{t('emailTrackingAnalytics.text16')}</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="links">
            <Card>
              <CardContent className="pt-6">
                {loading ? <SkeletonTable /> : linkClicks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">{'No link click data yet.'}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{'Link URL'}</TableHead>
                        <TableHead>{t('emailTrackingAnalytics.text17')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linkClicks.map(l => (
                        <TableRow key={l.url}>
                          <TableCell className="font-mono text-xs max-w-[500px] truncate">{l.url}</TableCell>
                          <TableCell><Badge>{l.count}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent">
            <Card>
              <CardContent className="pt-6">
                {loading ? <SkeletonEventFeed /> : (
                  <div className="space-y-2">
                    {events.slice(0, 50).map(e => (
                      <div key={e.id} className="flex items-center gap-3 p-2 border rounded text-sm">
                        <Badge variant={e.event_type === "bounced" ? "destructive" : e.event_type === "opened" ? "default" : "secondary"}>{e.event_type}</Badge>
                        <span className="text-muted-foreground">{e.recipient_email}</span>
                        {e.link_url && <span className="text-xs truncate max-w-[200px]">{e.link_url}</span>}
                        <span className="ml-auto text-xs text-muted-foreground" title={new Date(e.created_at).toLocaleString()}>
                          {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                    {events.length === 0 && <p className="text-muted-foreground text-center py-12">{'No recent events.'}</p>}
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
