import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirmDialog } from "@/components/ui/ConfirmActionDialog";
import type { LucideIcon } from "lucide-react";
import {
  DollarSign, Eye, CheckCircle, XCircle, Clock, Send, FileText,
  TrendingUp, Search, ArrowUpDown, Download, MailCheck, HandshakeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────

interface Offer {
  id: string;
  candidate_id: string;
  job_id: string;
  base_salary: number | null;
  salary_amount?: number | null; // legacy alias
  total_compensation: number | null;
  currency?: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  notes: string | null;
  candidate_name?: string;
  job_title?: string;
}

interface OfferAction {
  id: string;
  offer_id: string;
  action_type: string;
  actor_id: string | null;
  actor_type: string;
  decline_reason: string | null;
  notes: string | null;
  created_at: string;
  actor_name?: string;
}

type SortField = "salary" | "status" | "created_at";
type SortDir = "asc" | "desc";

// ─── Constants ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; icon: LucideIcon; label: string }> = {
  draft:        { color: "secondary",    icon: FileText,      label: "Draft" },
  sent:         { color: "default",      icon: Send,          label: "Sent" },
  viewed:       { color: "outline",      icon: Eye,           label: "Viewed" },
  accepted:     { color: "default",      icon: CheckCircle,   label: "Accepted" },
  declined:     { color: "destructive",  icon: XCircle,       label: "Declined" },
  rejected:     { color: "destructive",  icon: XCircle,       label: "Rejected" },
  expired:      { color: "secondary",    icon: Clock,         label: "Expired" },
  negotiating:  { color: "outline",      icon: TrendingUp,    label: "Negotiating" },
  pending_approval: { color: "outline",  icon: MailCheck,     label: "Pending Approval" },
};

const STATUS_TRANSITIONS: Record<string, { label: string; icon: LucideIcon; status: string }[]> = {
  draft: [
    { label: "Send", icon: Send, status: "sent" },
  ],
  sent: [
    { label: "Mark Viewed", icon: Eye, status: "viewed" },
  ],
  viewed: [
    { label: "Negotiating", icon: TrendingUp, status: "negotiating" },
    { label: "Accept", icon: CheckCircle, status: "accepted" },
    { label: "Decline", icon: XCircle, status: "declined" },
  ],
  negotiating: [
    { label: "Accept", icon: CheckCircle, status: "accepted" },
    { label: "Decline", icon: XCircle, status: "declined" },
  ],
  pending_approval: [
    { label: "Send", icon: Send, status: "sent" },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────

function getSalary(offer: Offer): number | null {
  return offer.base_salary ?? offer.salary_amount ?? offer.total_compensation ?? null;
}

function formatSalary(offer: Offer): string {
  const { t } = useTranslation('admin');
  const amount = getSalary(offer);
  if (amount == null) return "\u2014";
  const cur = offer.currency || "EUR";
  return `${cur} ${Number(amount).toLocaleString()}`;
}

function exportCsv(offers: Offer[]) {
  const header = "ID,Candidate,Job,Salary,Currency,Status,Expires,Created\n";
  const rows = offers.map((o) => {
    const sal = getSalary(o) ?? "";
    const exp = o.expires_at ? format(new Date(o.expires_at), "yyyy-MM-dd") : "";
    const cre = format(new Date(o.created_at), "yyyy-MM-dd");
    return [
      o.id,
      `"${(o.candidate_name || o.candidate_id).replace(/"/g, '""')}"`,
      `"${(o.job_title || o.job_id).replace(/"/g, '""')}"`,
      sal,
      o.currency || "EUR",
      o.status,
      exp,
      cre,
    ].join(",");
  });
  const blob = new Blob([header + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `offers-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Skeleton loaders ────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────

export default function OfferManagement() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [actions, setActions] = useState<OfferAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const { confirm, Dialog: ConfirmDialog } = useConfirmDialog();

  // ─── Data fetching ────────────────────────────────────────

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    setLoading(true);

    // Fetch offers with joined candidate name and job title
    const { data: offersData, error } = await supabase
      .from("candidate_offers")
      .select(`
        *,
        candidate_profiles ( full_name ),
        jobs ( title )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching offers:", error);
      toast.error('Failed to load offers');
      setLoading(false);
      return;
    }

    const enriched: Offer[] = (offersData || []).map((o: Record<string, unknown>) => ({
      ...o,
      candidate_name: o.candidate_profiles?.full_name || null,
      job_title: o.jobs?.title || null,
    }));

    setOffers(enriched);
    setLoading(false);
  };

  const openOfferDetail = async (offer: Offer) => {
    setSelectedOffer(offer);

    // Fetch actions with actor names from profiles
    const { data: actionsData } = await supabase
      .from("offer_acceptance_actions")
      .select("*, profiles:actor_id ( full_name )")
      .eq("offer_id", offer.id)
      .order("created_at");

    if (actionsData) {
      const enrichedActions: OfferAction[] = actionsData.map((a: Record<string, unknown>) => ({
        ...a,
        actor_name: a.profiles?.full_name || null,
      }));
      setActions(enrichedActions);
    }
  };

  // ─── Status transitions with confirmation ──────────────────

  const handleStatusChange = useCallback(
    (offerId: string, newStatus: string, offerLabel: string) => {
      const isDestructive = newStatus === "declined" || newStatus === "rejected";

      confirm(
        {
          type: isDestructive ? "destructive" : "confirm",
          title: isDestructive ? 'Decline Offer' : 'Update Offer',
          description: "offers.confirm.description",
          confirmText: isDestructive ? 'Decline Offer' : "offers.confirm.markAs",
        },
        async () => {
          await updateOfferStatus(offerId, newStatus);
        },
      );
    },
    [confirm],
  );

  const updateOfferStatus = async (offerId: string, newStatus: string) => {
    const { error } = await supabase
      .from("candidate_offers")
      .update({ status: newStatus })
      .eq("id", offerId);

    if (error) {
      toast.error('Failed to update offer status');
      return;
    }

    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from("offer_acceptance_actions").insert({
      offer_id: offerId,
      action_type: newStatus === "sent" ? "viewed" : newStatus,
      actor_id: user?.id,
      actor_type: "admin",
    });

    toast.success("offers.toast.markedAs");
    fetchOffers();
    if (selectedOffer && selectedOffer.id === offerId) {
      openOfferDetail({ ...selectedOffer, status: newStatus });
    }
  };

  // ─── Filtering, searching, sorting ────────────────────────

  const filtered = useMemo(() => {
    let result = offers;

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          (o.candidate_name || "").toLowerCase().includes(q) ||
          (o.job_title || "").toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q),
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "salary":
          cmp = (getSalary(a) ?? 0) - (getSalary(b) ?? 0);
          break;
        case "status":
          cmp = (a.status || "").localeCompare(b.status || "");
          break;
        case "created_at":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [offers, statusFilter, searchQuery, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // ─── Stats ────────────────────────────────────────────────

  const total = offers.length;
  const accepted = offers.filter((o) => o.status === "accepted").length;
  const declined = offers.filter((o) => o.status === "declined" || o.status === "rejected").length;
  const pending = offers.filter((o) => ["sent", "viewed", "negotiating", "pending_approval"].includes(o.status)).length;
  const acceptRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

  // ─── Render ───────────────────────────────────────────────

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">{'OFFER MANAGEMENT'}</h1>
          </div>
          <p className="text-muted-foreground">{'Track offers, acceptances, negotiations, and signatures'}</p>
        </div>

        {/* Stats */}
        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{'Total Offers'}</CardDescription>
                <CardTitle className="text-2xl">{total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{'Pending'}</CardDescription>
                <CardTitle className="text-2xl text-amber-600">{pending}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{'Accepted'}</CardDescription>
                <CardTitle className="text-2xl text-green-600">{accepted}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{'Declined'}</CardDescription>
                <CardTitle className="text-2xl text-red-600">{declined}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{'Accept Rate'}</CardDescription>
                <CardTitle className="text-2xl">{acceptRate}%</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Table card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle>{'All Offers'}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={'Search candidate or job...'}
                    className="pl-8 w-56"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Status filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{'All Status'}</SelectItem>
                    <SelectItem value="draft">{'Draft'}</SelectItem>
                    <SelectItem value="sent">{'Sent'}</SelectItem>
                    <SelectItem value="viewed">{'Viewed'}</SelectItem>
                    <SelectItem value="accepted">{'Accepted'}</SelectItem>
                    <SelectItem value="declined">{'Declined'}</SelectItem>
                    <SelectItem value="negotiating">{'Negotiating'}</SelectItem>
                    <SelectItem value="expired">{'Expired'}</SelectItem>
                  </SelectContent>
                </Select>

                {/* CSV Export */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportCsv(filtered)}
                  disabled={filtered.length === 0}
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton />
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">
                {offers.length === 0
                  ? 'No offers created yet. Offers will appear as they are generated from the hiring pipeline.'
                  : 'No offers match the current filters.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{'Candidate'}</TableHead>
                      <TableHead>{'Job'}</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 font-medium hover:bg-transparent"
                          onClick={() => toggleSort("salary")}
                        >
                          {'Salary'}
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 font-medium hover:bg-transparent"
                          onClick={() => toggleSort("status")}
                        >
                          {'Status'}
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableHead>
                      <TableHead>{'Expires'}</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 font-medium hover:bg-transparent"
                          onClick={() => toggleSort("created_at")}
                        >
                          {'Created'}
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableHead>
                      <TableHead>{'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((offer) => {
                      const cfg = STATUS_CONFIG[offer.status] || STATUS_CONFIG.draft;
                      const Icon = cfg.icon;
                      const transitions = STATUS_TRANSITIONS[offer.status] || [];

                      return (
                        <TableRow
                          key={offer.id}
                          className="cursor-pointer"
                          onClick={() => openOfferDetail(offer)}
                        >
                          <TableCell className="font-medium">
                            {offer.candidate_name || (
                              <span className="text-muted-foreground font-mono text-xs">
                                {offer.candidate_id?.slice(0, 8)}...
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {offer.job_title || (
                              <span className="text-muted-foreground font-mono text-xs">
                                {offer.job_id?.slice(0, 8)}...
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{formatSalary(offer)}</TableCell>
                          <TableCell>
                            <Badge variant={cfg.color as "default" | "secondary" | "destructive" | "outline"}>
                              <Icon className="h-3 w-3 mr-1" />
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {offer.expires_at
                              ? formatDistanceToNow(new Date(offer.expires_at), { addSuffix: true })
                              : 'No expiry'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              {transitions.map((t) => (
                                <Button
                                  key={t.status}
                                  size="sm"
                                  variant={t.status === "declined" || t.status === "rejected" ? "destructive" : "outline"}
                                  onClick={() =>
                                    handleStatusChange(
                                      offer.id,
                                      t.status,
                                      offer.candidate_name || offer.id.slice(0, 8),
                                    )
                                  }
                                >
                                  <t.icon className="h-3 w-3 mr-1" />
                                  {t.label}
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Offer Detail Dialog ─────────────────────────────── */}
        <Dialog open={!!selectedOffer} onOpenChange={() => setSelectedOffer(null)}>
          <DialogContent className="max-w-lg">
            {selectedOffer && (() => {
              const cfg = STATUS_CONFIG[selectedOffer.status] || STATUS_CONFIG.draft;
              const Icon = cfg.icon;
              const transitions = STATUS_TRANSITIONS[selectedOffer.status] || [];

              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">{'Offer Details'}<Badge variant={cfg.color as "default" | "secondary" | "destructive" | "outline"} className="ml-2">
                        <Icon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{'Candidate'}</p>
                        <p className="font-medium">
                          {selectedOffer.candidate_name || selectedOffer.candidate_id?.slice(0, 12)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{'Job'}</p>
                        <p className="font-medium">
                          {selectedOffer.job_title || selectedOffer.job_id?.slice(0, 12)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{'Salary'}</p>
                        <p className="font-medium">{formatSalary(selectedOffer)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{'Status'}</p>
                        <Badge variant={cfg.color as "default" | "secondary" | "destructive" | "outline"}>
                          <Icon className="h-3 w-3 mr-1" />
                          {cfg.label}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{'Created'}</p>
                        <p className="text-sm">
                          {format(new Date(selectedOffer.created_at), "PPpp")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{'Expires'}</p>
                        <p className="text-sm">
                          {selectedOffer.expires_at
                            ? format(new Date(selectedOffer.expires_at), "PPpp")
                            : 'No expiry'}
                        </p>
                      </div>
                    </div>

                    {selectedOffer.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{'Notes'}</p>
                        <p className="text-sm bg-muted/50 rounded p-2">{selectedOffer.notes}</p>
                      </div>
                    )}

                    {/* Activity Timeline */}
                    {actions.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">{'Activity Timeline'}</h4>
                        <div className="space-y-2">
                          {actions.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center gap-3 p-2 border rounded text-sm"
                            >
                              <Badge variant="outline" className="text-xs shrink-0">
                                {a.action_type}
                              </Badge>
                              <span className="font-medium">
                                {a.actor_name || a.actor_type}
                              </span>
                              {a.actor_name && (
                                <span className="text-muted-foreground text-xs">
                                  ({a.actor_type})
                                </span>
                              )}
                              {a.decline_reason && (
                                <span className="text-xs text-red-600">
                                  {'Reason:'} {a.decline_reason}
                                </span>
                              )}
                              {a.notes && (
                                <span className="text-xs text-muted-foreground truncate max-w-32">
                                  {a.notes}
                                </span>
                              )}
                              <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status transition buttons in dialog footer */}
                  {transitions.length > 0 && (
                    <DialogFooter className="flex-wrap gap-2">
                      {transitions.map((t) => (
                        <Button
                          key={t.status}
                          variant={t.status === "declined" || t.status === "rejected" ? "destructive" : "default"}
                          onClick={() => {
                            handleStatusChange(
                              selectedOffer.id,
                              t.status,
                              selectedOffer.candidate_name || selectedOffer.id.slice(0, 8),
                            );
                          }}
                        >
                          <t.icon className="h-4 w-4 mr-2" />
                          {t.label}
                        </Button>
                      ))}
                    </DialogFooter>
                  )}
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Confirm dialog rendered from hook */}
        <ConfirmDialog />
      </div>
    </RoleGate>
  );
}
