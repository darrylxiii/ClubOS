import { useState, useEffect, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Headphones, Clock, CheckCircle, AlertTriangle, MessageSquare, BarChart3, Settings, User, Send, Search, Download } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface SLAPolicy {
  id: string;
  priority: string;
  first_response_hours: number;
  resolution_hours: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "destructive",
  high: "default",
  medium: "secondary",
  low: "outline",
};

const STATUS_COLORS: Record<string, string> = {
  open: "destructive",
  in_progress: "default",
  resolved: "secondary",
  closed: "outline",
};

export default function SupportTicketAdmin() {
  const { t } = useTranslation('admin');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [slaPolicies, setSlaPolicies] = useState<SLAPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [ticketRes, slaRes] = await Promise.all([
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
      supabase.from("support_ticket_sla").select("*").order("first_response_hours"),
    ]);
    if (ticketRes.data) setTickets(ticketRes.data);
    if (slaRes.data) setSlaPolicies(slaRes.data);
    setLoading(false);
  };

  const updateStatus = async (ticketId: string, newStatus: string) => {
    const { error } = await supabase.from("support_tickets").update({ status: newStatus }).eq("id", ticketId);
    if (!error) { toast.success(`Ticket ${newStatus}`); fetchData(); }
  };

  const openTicketDetail = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    const { data } = await supabase.from("support_ticket_responses").select("*").eq("ticket_id", ticket.id).order("created_at");
    if (data) setResponses(data);
  };

  const sendResponse = async () => {
    if (!selectedTicket || !responseText.trim()) return;
    const { error } = await supabase.from("support_ticket_responses").insert({
      ticket_id: selectedTicket.id,
      responder_id: (await supabase.auth.getUser()).data.user?.id,
      body: responseText,
      is_internal_note: false,
    });
    if (!error) {
      toast.success('Response sent');
      setResponseText("");
      if (selectedTicket.status === "open") {
        await supabase.from("support_tickets").update({ status: "in_progress" }).eq("id", selectedTicket.id);
      }
      openTicketDetail(selectedTicket);
      fetchData();
    }
  };

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubject = (t.subject || "").toLowerCase().includes(q);
        const matchDescription = (t.description || "").toLowerCase().includes(q);
        if (!matchSubject && !matchDescription) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, priorityFilter, searchQuery]);

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ["Subject", "Priority", "Status", "Category", "SLA", "Created", "Updated", "Description"];
    const rows = filtered.map(t => [
      t.subject,
      t.priority,
      t.status,
      t.category || "general",
      isSlaBreached(t) ? "Breached" : "OK",
      format(new Date(t.created_at), "yyyy-MM-dd HH:mm"),
      t.updated_at ? format(new Date(t.updated_at), "yyyy-MM-dd HH:mm") : "",
      (t.description || "").replace(/\n/g, " ").slice(0, 200),
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `support-tickets-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} tickets`);
  };

  const critical = tickets.filter(t => t.priority === "critical" && t.status !== "closed").length;
  const high = tickets.filter(t => t.priority === "high" && t.status !== "closed").length;
  const open = tickets.filter(t => t.status === "open" || t.status === "in_progress").length;
  const resolved = tickets.filter(t => t.status === "resolved" || t.status === "closed").length;

  const isSlaBreached = (ticket: Ticket) => {
    const sla = slaPolicies.find(s => s.priority === ticket.priority);
    if (!sla) return false;
    const hoursSinceCreation = (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60);
    return ticket.status === "open" && hoursSinceCreation > sla.first_response_hours;
  };

  const SkeletonTable = ({ rows = 4, cols = 7 }: { rows?: number; cols?: number }) => (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {[...Array(cols)].map((_, j) => (
            <Skeleton key={j} className="h-5 w-full" />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Headphones className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">{'SUPPORT MANAGEMENT'}</h1>
          </div>
          <p className="text-muted-foreground">{'Triage, assign, and resolve support tickets with SLA tracking'}</p>
        </div>

        <Tabs defaultValue="queue">
          <TabsList>
            <TabsTrigger value="queue">{'Ticket Queue'}</TabsTrigger>
            <TabsTrigger value="analytics">{t('supportTicketAdmin.text1')}</TabsTrigger>
            <TabsTrigger value="sla">{'SLA Policies'}</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-6">
            {/* Stats Cards */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-12" /></CardHeader></Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-red-500/50"><CardHeader className="pb-2"><CardDescription>{t('supportTicketAdmin.text2')}</CardDescription><CardTitle className="text-2xl text-red-600">{critical}</CardTitle></CardHeader></Card>
                <Card className="border-amber-500/50"><CardHeader className="pb-2"><CardDescription>{'High Priority'}</CardDescription><CardTitle className="text-2xl text-amber-600">{high}</CardTitle></CardHeader></Card>
                <Card><CardHeader className="pb-2"><CardDescription>{'Open Tickets'}</CardDescription><CardTitle className="text-2xl">{open}</CardTitle></CardHeader></Card>
                <Card><CardHeader className="pb-2"><CardDescription>{t('supportTicketAdmin.text3')}</CardDescription><CardTitle className="text-2xl text-green-600">{resolved}</CardTitle></CardHeader></Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle>{'All Tickets'}</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={'Search subject or description...'}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 w-72"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{'All Status'}</SelectItem>
                        <SelectItem value="open">{t('supportTicketAdmin.text4')}</SelectItem>
                        <SelectItem value="in_progress">{'In Progress'}</SelectItem>
                        <SelectItem value="resolved">{t('supportTicketAdmin.text5')}</SelectItem>
                        <SelectItem value="closed">{t('supportTicketAdmin.text6')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{'All Priority'}</SelectItem>
                        <SelectItem value="critical">{t('supportTicketAdmin.text7')}</SelectItem>
                        <SelectItem value="high">{t('supportTicketAdmin.text8')}</SelectItem>
                        <SelectItem value="medium">{t('supportTicketAdmin.text9')}</SelectItem>
                        <SelectItem value="low">{t('supportTicketAdmin.text10')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={exportCSV}>
                      <Download className="h-4 w-4 mr-2" />{'Export CSV'}</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <SkeletonTable rows={5} cols={7} />
                ) : filtered.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">
                    {tickets.length === 0
                      ? "No tickets in queue. Support tickets submitted by users will appear here."
                      : searchQuery
                        ? `No tickets matching "${searchQuery}".`
                        : "No tickets match the selected filters."}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('supportTicketAdmin.text11')}</TableHead>
                        <TableHead>{t('supportTicketAdmin.text12')}</TableHead>
                        <TableHead>{t('supportTicketAdmin.text13')}</TableHead>
                        <TableHead>{t('supportTicketAdmin.text14')}</TableHead>
                        <TableHead>SLA</TableHead>
                        <TableHead>{t('supportTicketAdmin.text15')}</TableHead>
                        <TableHead>{t('supportTicketAdmin.text16')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(ticket => (
                        <TableRow key={ticket.id} className="cursor-pointer" onClick={() => openTicketDetail(ticket)}>
                          <TableCell className="font-medium max-w-[250px] truncate">{ticket.subject}</TableCell>
                          <TableCell><Badge variant={PRIORITY_COLORS[ticket.priority] as any}>{ticket.priority}</Badge></TableCell>
                          <TableCell><Badge variant={STATUS_COLORS[ticket.status] as any}>{ticket.status.replace("_", " ")}</Badge></TableCell>
                          <TableCell><Badge variant="outline">{ticket.category || "general"}</Badge></TableCell>
                          <TableCell>
                            {isSlaBreached(ticket) ? (
                              <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{t('supportTicketAdmin.text17')}</Badge>
                            ) : (
                              <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />OK</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm" title={format(new Date(ticket.created_at), "PPpp")}>
                            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              {ticket.status === "open" && <Button size="sm" variant="outline" onClick={() => updateStatus(ticket.id, "in_progress")}>{t('supportTicketAdmin.text18')}</Button>}
                              {ticket.status === "in_progress" && <Button size="sm" variant="outline" onClick={() => updateStatus(ticket.id, "resolved")}>{t('supportTicketAdmin.text19')}</Button>}
                              {ticket.status === "resolved" && <Button size="sm" variant="outline" onClick={() => updateStatus(ticket.id, "closed")}>{t('supportTicketAdmin.text20')}</Button>}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-28 mb-2" /><Skeleton className="h-8 w-16" /></CardHeader></Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardHeader className="pb-2"><CardDescription>{'Total Tickets'}</CardDescription><CardTitle className="text-2xl">{tickets.length}</CardTitle></CardHeader></Card>
                <Card><CardHeader className="pb-2"><CardDescription>{'Open Rate'}</CardDescription><CardTitle className="text-2xl">{tickets.length > 0 ? Math.round((open / tickets.length) * 100) : 0}%</CardTitle></CardHeader></Card>
                <Card><CardHeader className="pb-2"><CardDescription>{'Resolution Rate'}</CardDescription><CardTitle className="text-2xl">{tickets.length > 0 ? Math.round((resolved / tickets.length) * 100) : 0}%</CardTitle></CardHeader></Card>
                <Card><CardHeader className="pb-2"><CardDescription>{'SLA Breaches'}</CardDescription><CardTitle className="text-2xl text-red-600">{tickets.filter(t => isSlaBreached(t)).length}</CardTitle></CardHeader></Card>
              </div>
            )}
            <Card>
              <CardHeader><CardTitle>{'Tickets by Priority'}</CardTitle></CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {["critical", "high", "medium", "low"].map(p => {
                      const count = tickets.filter(t => t.priority === p).length;
                      const pct = tickets.length > 0 ? (count / tickets.length) * 100 : 0;
                      return (
                        <div key={p} className="flex items-center gap-3">
                          <Badge variant={PRIORITY_COLORS[p] as any} className="w-20 justify-center">{p}</Badge>
                          <div className="flex-1 bg-muted rounded-full h-3">
                            <div className="bg-primary rounded-full h-3" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sla" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />{'SLA Policies'}</CardTitle>
                <CardDescription>{'Response and resolution time targets per priority level'}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <SkeletonTable rows={4} cols={3} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('supportTicketAdmin.text21')}</TableHead>
                        <TableHead>{'First Response Target'}</TableHead>
                        <TableHead>{'Resolution Target'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slaPolicies.map(sla => (
                        <TableRow key={sla.id}>
                          <TableCell><Badge variant={PRIORITY_COLORS[sla.priority] as any}>{sla.priority}</Badge></TableCell>
                          <TableCell>{sla.first_response_hours} hours</TableCell>
                          <TableCell>{sla.resolution_hours} hours</TableCell>
                        </TableRow>
                      ))}
                      {slaPolicies.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">{'No SLA policies configured'}</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Ticket Detail Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedTicket && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Badge variant={PRIORITY_COLORS[selectedTicket.priority] as any}>{selectedTicket.priority}</Badge>
                    {selectedTicket.subject}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Badge variant={STATUS_COLORS[selectedTicket.status] as any}>{selectedTicket.status.replace("_", " ")}</Badge>
                    <Badge variant="outline">{selectedTicket.category || "general"}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto" title={format(new Date(selectedTicket.created_at), "PPpp")}>
                      {formatDistanceToNow(new Date(selectedTicket.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                    </CardContent>
                  </Card>

                  {responses.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">{t('supportTicketAdmin.text22')}</h4>
                      {responses.map((r: any) => (
                        <Card key={r.id} className={r.is_internal_note ? "border-amber-500/30 bg-amber-50/5" : ""}>
                          <CardContent className="pt-3 pb-3">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-3 w-3" />
                              <span className="text-xs font-medium">{r.is_internal_note ? "Internal Note" : "Response"}</span>
                              <span className="text-xs text-muted-foreground ml-auto" title={format(new Date(r.created_at), "PPpp")}>
                                {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm">{r.body}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{t('supportTicketAdmin.text23')}</Label>
                    <Textarea value={responseText} onChange={e => setResponseText(e.target.value)} placeholder={'Type your response...'} rows={3} />
                  </div>
                </div>
                <DialogFooter className="flex gap-2">
                  {selectedTicket.status === "open" && <Button variant="outline" onClick={() => { updateStatus(selectedTicket.id, "in_progress"); setSelectedTicket(null); }}>{'Take Ownership'}</Button>}
                  {selectedTicket.status === "in_progress" && <Button variant="outline" onClick={() => { updateStatus(selectedTicket.id, "resolved"); setSelectedTicket(null); }}>{'Mark Resolved'}</Button>}
                  <Button onClick={sendResponse} disabled={!responseText.trim()}><Send className="h-4 w-4 mr-2" />{'Send Response'}</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGate>
  );
}
