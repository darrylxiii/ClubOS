import { useState, useEffect, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarClock, Clock, CheckCircle, XCircle, Send, RefreshCw, Link2, Search, Download } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

interface SchedulingRequest {
  id: string;
  candidate_id: string;
  booking_link_id: string;
  selected_slot: string;
  token: string;
  status: string;
  candidate_name?: string;
  created_at: string;
  updated_at: string;
}

export default function CandidateSchedulingAdmin() {
  const { t } = useTranslation('admin');
  const [requests, setRequests] = useState<SchedulingRequest[]>([]);
  const [bookingLinks, setBookingLinks] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<SchedulingRequest | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [reqRes, blRes, profRes] = await Promise.all([
      supabase.from("candidate_scheduling_preferences").select("*").order("created_at", { ascending: false }),
      supabase.from("booking_links").select("id, title, interview_type, duration_minutes").limit(200),
      supabase.from("profiles").select("id, full_name").limit(500),
    ]);
    if (reqRes.data) setRequests(reqRes.data);
    if (blRes.data) setBookingLinks(blRes.data);
    if (profRes.data) setProfiles(profRes.data);
    setLoading(false);
  };

  const getName = (id: string) => profiles.find(p => p.id === id)?.full_name || id?.slice(0, 8) || "Unknown";
  const getBookingLink = (id: string) => bookingLinks.find(b => b.id === id);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("candidate_scheduling_preferences").update({ status }).eq("id", id);
    toast.success(`Request ${status}`);
    fetchData();
    if (selectedRequest?.id === id) setSelectedRequest(null);
  };

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const name = getName(r.candidate_id).toLowerCase();
        if (!name.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [requests, statusFilter, searchQuery, profiles]);

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ["Candidate", "Booking Link", "Selected Slot", "Status", "Submitted", "Updated"];
    const rows = filtered.map(r => {
      const bl = getBookingLink(r.booking_link_id);
      return [
        getName(r.candidate_id),
        bl?.title || r.booking_link_id || "",
        r.selected_slot ? format(new Date(r.selected_slot), "yyyy-MM-dd HH:mm") : "Not selected",
        r.status,
        format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
        r.updated_at ? format(new Date(r.updated_at), "yyyy-MM-dd HH:mm") : "",
      ];
    });
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `scheduling-requests-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} records`);
  };

  const pending = requests.filter(r => r.status === "pending").length;
  const confirmed = requests.filter(r => r.status === "confirmed").length;
  const cancelled = requests.filter(r => r.status === "cancelled").length;
  const expired = requests.filter(r => r.status === "expired").length;

  const SkeletonTable = ({ rows = 4, cols = 6 }: { rows?: number; cols?: number }) => (
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
            <CalendarClock className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">{'CANDIDATE SCHEDULING'}</h1>
          </div>
          <p className="text-muted-foreground">{'Manage self-service scheduling requests from candidates'}</p>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-12" /></CardHeader></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className={pending > 0 ? "border-amber-500/50" : ""}><CardHeader className="pb-2"><CardDescription>{t('candidateSchedulingAdmin.text1')}</CardDescription><CardTitle className="text-2xl text-amber-600">{pending}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{t('candidateSchedulingAdmin.text2')}</CardDescription><CardTitle className="text-2xl text-green-600">{confirmed}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{t('candidateSchedulingAdmin.text3')}</CardDescription><CardTitle className="text-2xl">{cancelled}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{t('candidateSchedulingAdmin.text4')}</CardDescription><CardTitle className="text-2xl text-muted-foreground">{expired}</CardTitle></CardHeader></Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle>{'Scheduling Requests'}</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={'Search by candidate name...'}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{'All Status'}</SelectItem>
                    <SelectItem value="pending">{t('candidateSchedulingAdmin.text5')}</SelectItem>
                    <SelectItem value="confirmed">{t('candidateSchedulingAdmin.text6')}</SelectItem>
                    <SelectItem value="rescheduled">{t('candidateSchedulingAdmin.text7')}</SelectItem>
                    <SelectItem value="cancelled">{t('candidateSchedulingAdmin.text8')}</SelectItem>
                    <SelectItem value="expired">{t('candidateSchedulingAdmin.text9')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-2" />{'Export CSV'}</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonTable rows={5} cols={6} />
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">
                {requests.length === 0
                  ? "No scheduling requests yet. Candidates can self-schedule via booking links."
                  : searchQuery
                    ? `No requests matching "${searchQuery}".`
                    : "No requests match the selected filter."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('candidateSchedulingAdmin.text10')}</TableHead>
                    <TableHead>{'Booking Link'}</TableHead>
                    <TableHead>{'Selected Slot'}</TableHead>
                    <TableHead>{t('candidateSchedulingAdmin.text11')}</TableHead>
                    <TableHead>{t('candidateSchedulingAdmin.text12')}</TableHead>
                    <TableHead>{t('candidateSchedulingAdmin.text13')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => {
                    const bl = getBookingLink(r.booking_link_id);
                    return (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelectedRequest(r)}>
                        <TableCell className="font-medium">{getName(r.candidate_id)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Link2 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{bl?.title || r.booking_link_id?.slice(0, 8) || "\u2014"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.selected_slot ? format(new Date(r.selected_slot), "MMM d, yyyy HH:mm") : "Not selected"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            r.status === "confirmed" ? "default" :
                            r.status === "pending" ? "secondary" :
                            r.status === "cancelled" ? "destructive" : "outline"
                          }>
                            {r.status === "confirmed" && <CheckCircle className="h-3 w-3 mr-1" />}
                            {r.status === "cancelled" && <XCircle className="h-3 w-3 mr-1" />}
                            {r.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm" title={format(new Date(r.created_at), "PPpp")}>
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            {r.status === "pending" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "confirmed")}>
                                  <CheckCircle className="h-3 w-3 mr-1" />Confirm
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => updateStatus(r.id, "cancelled")}>
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {r.status === "confirmed" && (
                              <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "rescheduled")}>
                                <RefreshCw className="h-3 w-3 mr-1" />Reschedule
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Booking Links Summary */}
        <Card>
          <CardHeader><CardTitle>{'Active Booking Links'}</CardTitle><CardDescription>{'Interview booking links available for candidate scheduling'}</CardDescription></CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded">
                    <Skeleton className="h-4 w-4 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-20 shrink-0" />
                  </div>
                ))}
              </div>
            ) : bookingLinks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{'No booking links configured. Create booking links in the interview scheduling section.'}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {bookingLinks.slice(0, 12).map(bl => (
                  <div key={bl.id} className="flex items-center gap-3 p-3 border rounded">
                    <Link2 className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{bl.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground">{bl.interview_type || "general"} · {bl.duration_minutes || 30}min</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {requests.filter(r => r.booking_link_id === bl.id).length} requests
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Detail Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent>
            {selectedRequest && (
              <>
                <DialogHeader><DialogTitle>{'Scheduling Request Details'}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-sm text-muted-foreground">{t('candidateSchedulingAdmin.text14')}</p><p className="font-medium">{getName(selectedRequest.candidate_id)}</p></div>
                    <div><p className="text-sm text-muted-foreground">{t('candidateSchedulingAdmin.text15')}</p><Badge variant={selectedRequest.status === "confirmed" ? "default" : "secondary"}>{selectedRequest.status}</Badge></div>
                    <div>
                      <p className="text-sm text-muted-foreground">{'Selected Slot'}</p>
                      <p className="font-medium">{selectedRequest.selected_slot ? format(new Date(selectedRequest.selected_slot), "PPpp") : "Not yet selected"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('candidateSchedulingAdmin.text16')}</p>
                      <p className="text-sm">{formatDistanceToNow(new Date(selectedRequest.created_at), { addSuffix: true })}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(selectedRequest.created_at), "PPpp")}</p>
                    </div>
                  </div>
                  {selectedRequest.token && (
                    <div><p className="text-sm text-muted-foreground">{'Scheduling Token'}</p><code className="text-xs font-mono bg-muted p-1 rounded">{selectedRequest.token}</code></div>
                  )}
                </div>
                <DialogFooter>
                  {selectedRequest.status === "pending" && (
                    <>
                      <Button variant="outline" onClick={() => updateStatus(selectedRequest.id, "cancelled")}>{t('candidateSchedulingAdmin.text17')}</Button>
                      <Button onClick={() => updateStatus(selectedRequest.id, "confirmed")}>{t('candidateSchedulingAdmin.text18')}</Button>
                    </>
                  )}
                  {selectedRequest.status === "confirmed" && (
                    <Button variant="outline" onClick={() => updateStatus(selectedRequest.id, "rescheduled")}>{t('candidateSchedulingAdmin.text19')}</Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGate>
  );
}
