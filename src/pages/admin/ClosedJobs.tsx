import { useState } from "react";
import { AdminTableSkeleton } from "@/components/LoadingSkeletons";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { format } from "date-fns";
import { 
  Search, CheckCircle2, XCircle, Ban, Pause,
  Star, Building2, Clock, Users,
  ExternalLink, FileText, Download
} from "lucide-react";
import { cn } from "@/lib/utils";

const CLOSURE_TYPE_CONFIG = {
  hired: { label: "Hired", icon: CheckCircle2, color: "bg-green-500/10 text-green-600 border-green-500/20" },
  not_filled: { label: "Not Filled", icon: XCircle, color: "bg-destructive/10 text-destructive border-destructive/20" },
  cancelled: { label: "Cancelled", icon: Ban, color: "bg-muted text-muted-foreground border-border" },
  on_hold: { label: "On Hold", icon: Pause, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
};

export default function ClosedJobs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedClosure, setSelectedClosure] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: closures, isLoading } = useQuery({
    queryKey: ['job-closures', filterType],
    queryFn: async () => {
      let query = supabase
        .from('job_closures')
        .select(`
          *,
          jobs:job_id (
            id,
            title,
            company_id,
            created_at,
            external_url,
            companies:company_id (
              id,
              name
            )
          ),
          hired_application:hired_application_id (
            id,
            candidate_full_name,
            candidate_email
          ),
          closed_by_profile:closed_by (
            id,
            full_name
          )
        `)
        .order('actual_closing_date', { ascending: false });

      if (filterType !== "all") {
        query = query.eq('closure_type', filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filteredClosures = closures?.filter(closure => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      closure.jobs?.title?.toLowerCase().includes(search) ||
      closure.jobs?.companies?.name?.toLowerCase().includes(search)
    );
  }) || [];

  // Calculate summary stats
  const stats = {
    total: closures?.length || 0,
    hired: closures?.filter(c => c.closure_type === 'hired').length || 0,
    notFilled: closures?.filter(c => c.closure_type === 'not_filled').length || 0,
    avgTimeToFill: closures
      ?.filter(c => c.closure_type === 'hired' && c.time_to_fill_days)
      .reduce((acc, c, _, arr) => acc + (c.time_to_fill_days || 0) / arr.length, 0) || 0,
  };

  const successRate = stats.total > 0 ? Math.round((stats.hired / stats.total) * 100) : 0;

  const openDetail = (closure: any) => {
    setSelectedClosure(closure);
    setDetailOpen(true);
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground text-sm">Not rated</span>;
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              "w-4 h-4",
              i < rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground"
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Closed Jobs Archive</h1>
            <p className="text-muted-foreground">Review past placements and learn from outcomes</p>
          </div>
          <Button variant="outline" className="w-fit">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Closed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{successRate}%</p>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Math.round(stats.avgTimeToFill)}</p>
                  <p className="text-sm text-muted-foreground">Avg Days to Fill</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.notFilled}</p>
                  <p className="text-sm text-muted-foreground">Not Filled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by job title or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                  <SelectItem value="not_filled">Not Filled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Closed Date</TableHead>
                  <TableHead>Time to Fill</TableHead>
                  <TableHead>Ratings</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <AdminTableSkeleton columns={7} />
                ) : filteredClosures.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No closed jobs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClosures.map((closure) => {
                    const config = CLOSURE_TYPE_CONFIG[closure.closure_type as keyof typeof CLOSURE_TYPE_CONFIG];
                    const Icon = config?.icon || FileText;
                    return (
                      <TableRow key={closure.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(closure)}>
                        <TableCell>
                          <div className="font-medium">{closure.jobs?.title}</div>
                          {closure.jobs?.external_url && (
                            <a
                              href={closure.jobs.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" />
                              View posting
                            </a>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            {closure.jobs?.companies?.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("gap-1", config?.color)}>
                            <Icon className="w-3 h-3" />
                            {config?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(closure.actual_closing_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {closure.time_to_fill_days ? (
                            <span>{closure.time_to_fill_days} days</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-0.5">
                            {[closure.candidate_quality_rating, closure.client_responsiveness_rating, closure.market_difficulty_rating]
                              .filter(Boolean)
                              .slice(0, 1)
                              .map((rating, i) => (
                                <div key={i} className="flex gap-0.5">
                                  {[...Array(rating)].map((_, j) => (
                                    <Star key={j} className="w-3 h-3 text-amber-400 fill-amber-400" />
                                  ))}
                                </div>
                              ))}
                            {!closure.candidate_quality_rating && !closure.client_responsiveness_rating && !closure.market_difficulty_rating && (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detail Sheet */}
        <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            {selectedClosure && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedClosure.jobs?.title}</SheetTitle>
                  <SheetDescription>
                    {selectedClosure.jobs?.companies?.name} • Closed {format(new Date(selectedClosure.actual_closing_date), "MMMM d, yyyy")}
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                  {/* Status */}
                  <div className="flex items-center gap-3">
                    {(() => {
                      const config = CLOSURE_TYPE_CONFIG[selectedClosure.closure_type as keyof typeof CLOSURE_TYPE_CONFIG];
                      const Icon = config?.icon || FileText;
                      return (
                        <Badge variant="outline" className={cn("gap-1 text-base px-3 py-1", config?.color)}>
                          <Icon className="w-4 h-4" />
                          {config?.label}
                        </Badge>
                      );
                    })()}
                    {selectedClosure.time_to_fill_days && (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="w-3 h-3" />
                        {selectedClosure.time_to_fill_days} days to fill
                      </Badge>
                    )}
                  </div>

                  {/* Hired Candidate */}
                  {selectedClosure.closure_type === 'hired' && selectedClosure.hired_application && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          Hired Candidate
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="font-medium">{selectedClosure.hired_application.candidate_full_name}</div>
                        <div className="text-sm text-muted-foreground">{selectedClosure.hired_application.candidate_email}</div>
                        {selectedClosure.actual_salary && (
                          <div className="mt-2 text-sm">
                            Salary: €{selectedClosure.actual_salary.toLocaleString()}
                          </div>
                        )}
                        {selectedClosure.placement_fee && (
                          <div className="text-sm text-green-600">
                            Fee: €{selectedClosure.placement_fee.toLocaleString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Loss Reason */}
                  {selectedClosure.closure_type === 'not_filled' && selectedClosure.loss_reason && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Loss Reason</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="secondary">
                          {selectedClosure.loss_reason.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </Badge>
                      </CardContent>
                    </Card>
                  )}

                  {/* Ratings */}
                  {(selectedClosure.candidate_quality_rating || selectedClosure.client_responsiveness_rating || selectedClosure.market_difficulty_rating) && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Ratings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {selectedClosure.candidate_quality_rating && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Candidate Quality</span>
                            {renderStars(selectedClosure.candidate_quality_rating)}
                          </div>
                        )}
                        {selectedClosure.client_responsiveness_rating && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Client Responsiveness</span>
                            {renderStars(selectedClosure.client_responsiveness_rating)}
                          </div>
                        )}
                        {selectedClosure.market_difficulty_rating && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Market Difficulty</span>
                            {renderStars(selectedClosure.market_difficulty_rating)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Pipeline Metrics */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Pipeline Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold">{selectedClosure.total_applicants || 0}</div>
                          <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{selectedClosure.candidates_interviewed || 0}</div>
                          <div className="text-xs text-muted-foreground">Interviewed</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{selectedClosure.candidates_final_round || 0}</div>
                          <div className="text-xs text-muted-foreground">Final Round</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Takeaways */}
                  {(selectedClosure.what_went_well || selectedClosure.what_could_improve) && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Takeaways</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedClosure.what_went_well && (
                          <div>
                            <div className="text-xs font-medium text-green-600 mb-1">What went well</div>
                            <p className="text-sm">{selectedClosure.what_went_well}</p>
                          </div>
                        )}
                        {selectedClosure.what_could_improve && (
                          <div>
                            <div className="text-xs font-medium text-amber-600 mb-1">What could improve</div>
                            <p className="text-sm">{selectedClosure.what_could_improve}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Key Learnings */}
                  {selectedClosure.key_learnings && selectedClosure.key_learnings.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Key Learnings</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {selectedClosure.key_learnings.map((learning: string) => (
                            <Badge key={learning} variant="secondary">
                              {learning}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommendations */}
                  {selectedClosure.recommendations_for_future && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Recommendations for Future</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{selectedClosure.recommendations_for_future}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Notes */}
                  {selectedClosure.notes && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Additional Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{selectedClosure.notes}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Metadata */}
                  <div className="text-xs text-muted-foreground pt-4 border-t">
                    Closed by {selectedClosure.closed_by_profile?.full_name || 'Unknown'} on{' '}
                    {format(new Date(selectedClosure.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}