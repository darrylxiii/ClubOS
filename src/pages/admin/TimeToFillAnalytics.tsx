import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Timer, TrendingDown, TrendingUp, BarChart3, AlertTriangle, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, formatDistanceToNow } from "date-fns";

interface StageMetric {
  stage: string;
  avgHours: number;
  medianHours: number;
  count: number;
  dropOffRate: number;
}

interface JobMetric {
  job_id: string;
  job_title: string;
  department: string;
  total_days: number;
  applications: number;
  hires: number;
  created_at?: string;
}

export default function TimeToFillAnalytics() {
  const { t } = useTranslation('admin');
  const [stageHistory, setStageHistory] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("90");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [jobSearchQuery, setJobSearchQuery] = useState("");

  useEffect(() => { fetchData(); }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    const since = subDays(new Date(), parseInt(dateRange)).toISOString();
    const [historyRes, jobsRes] = await Promise.all([
      supabase.from("application_stage_history").select("*").gte("transitioned_at", since).order("transitioned_at"),
      supabase.from("jobs").select("id, title, department, status, created_at").order("created_at", { ascending: false }),
    ]);
    if (historyRes.error) { toast.error('Failed to load stage history'); console.error(historyRes.error); }
    if (jobsRes.error) { toast.error('Failed to load jobs'); console.error(jobsRes.error); }
    if (historyRes.data) setStageHistory(historyRes.data);
    if (jobsRes.data) setJobs(jobsRes.data);
    setLoading(false);
  };

  const departments = [...new Set(jobs.map(j => j.department).filter(Boolean))];

  // Compute stage metrics
  const stageMetrics: StageMetric[] = (() => {
    const grouped: Record<string, number[]> = {};
    const stageCounts: Record<string, { entered: number; exited: number }> = {};
    stageHistory.forEach(h => {
      if (h.from_stage) {
        if (!grouped[h.from_stage]) grouped[h.from_stage] = [];
        if (h.duration_in_stage_hours) grouped[h.from_stage].push(h.duration_in_stage_hours);
        if (!stageCounts[h.from_stage]) stageCounts[h.from_stage] = { entered: 0, exited: 0 };
        stageCounts[h.from_stage].exited++;
      }
      if (h.to_stage) {
        if (!stageCounts[h.to_stage]) stageCounts[h.to_stage] = { entered: 0, exited: 0 };
        stageCounts[h.to_stage].entered++;
      }
    });
    return Object.entries(grouped).map(([stage, hours]) => {
      const sorted = [...hours].sort((a, b) => a - b);
      const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
      const median = sorted[Math.floor(sorted.length / 2)] || 0;
      const sc = stageCounts[stage] || { entered: 0, exited: 0 };
      const dropOff = sc.entered > 0 ? Math.round(((sc.entered - sc.exited) / sc.entered) * 100) : 0;
      return { stage, avgHours: Math.round(avg), medianHours: Math.round(median), count: hours.length, dropOffRate: dropOff };
    }).sort((a, b) => b.count - a.count);
  })();

  // Compute per-job time to fill
  const jobMetrics: JobMetric[] = (() => {
    const jobMap: Record<string, { stages: any[]; job: any }> = {};
    stageHistory.forEach(h => {
      if (!jobMap[h.job_id]) {
        const job = jobs.find(j => j.id === h.job_id);
        jobMap[h.job_id] = { stages: [], job };
      }
      jobMap[h.job_id].stages.push(h);
    });
    return Object.entries(jobMap)
      .map(([job_id, { stages, job }]) => {
        const totalHours = stages.reduce((a: number, s: any) => a + (s.duration_in_stage_hours || 0), 0);
        return {
          job_id,
          job_title: job?.title || "Unknown",
          department: job?.department || "\u2014",
          total_days: Math.round(totalHours / 24),
          applications: stages.length,
          hires: stages.filter((s: any) => s.to_stage === "hired").length,
          created_at: job?.created_at,
        };
      })
      .filter(j => departmentFilter === "all" || j.department === departmentFilter)
      .filter(j => !jobSearchQuery.trim() || j.job_title.toLowerCase().includes(jobSearchQuery.toLowerCase()))
      .sort((a, b) => b.total_days - a.total_days);
  })();

  const overallAvgDays = jobMetrics.length > 0 ? Math.round(jobMetrics.reduce((a, j) => a + j.total_days, 0) / jobMetrics.length) : 0;
  const bottleneckStage = stageMetrics.length > 0 ? stageMetrics.reduce((a, b) => a.avgHours > b.avgHours ? a : b) : null;
  const totalTransitions = stageHistory.length;

  const exportCSV = () => {
    const headers = "Job,Department,Days to Fill,Applications,Hires\n";
    const rows = jobMetrics.map(j => `"${j.job_title}","${j.department}",${j.total_days},${j.applications},${j.hires}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `time-to-fill-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const SkeletonCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-8 w-16" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );

  const SkeletonStageFunnel = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40 mb-1" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const SkeletonJobTable = () => (
    <div className="space-y-3 py-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
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
              <Timer className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{t('timeToFill.title')}</h1>
            </div>
            <p className="text-muted-foreground">{t('timeToFill.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">{t('timeToFill.last30Days')}</SelectItem>
                <SelectItem value="90">{t('timeToFill.last90Days')}</SelectItem>
                <SelectItem value="180">{t('timeToFill.last6Months')}</SelectItem>
                <SelectItem value="365">{t('timeToFill.lastYear')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV} disabled={loading || jobMetrics.length === 0}>
              <Download className="h-4 w-4 mr-2" />{t('timeToFill.exportCSV')}</Button>
          </div>
        </div>

        {loading ? <SkeletonCards /> : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardDescription>{t('timeToFill.avgTimeToFill')}</CardDescription><CardTitle className="text-2xl">{overallAvgDays} {t('timeToFill.days')}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{t('timeToFill.bottleneckStage')}</CardDescription><CardTitle className="text-lg text-amber-600">{bottleneckStage?.stage || "\u2014"}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{t('timeToFill.stageTransitions')}</CardDescription><CardTitle className="text-2xl">{totalTransitions}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{t('timeToFill.jobsAnalyzed')}</CardDescription><CardTitle className="text-2xl">{jobMetrics.length}</CardTitle></CardHeader></Card>
          </div>
        )}

        {/* Stage Funnel */}
        {loading ? <SkeletonStageFunnel /> : (
          <Card>
            <CardHeader><CardTitle>{t('timeToFill.stagePerformance')}</CardTitle><CardDescription>{t('timeToFill.stagePerformanceDesc')}</CardDescription></CardHeader>
            <CardContent>
              {stageMetrics.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">{t('timeToFill.noStageData')}</p>
              ) : (
                <div className="space-y-3">
                  {stageMetrics.map(s => {
                    const maxHours = Math.max(...stageMetrics.map(m => m.avgHours), 1);
                    const pct = (s.avgHours / maxHours) * 100;
                    const isBottleneck = bottleneckStage?.stage === s.stage;
                    return (
                      <div key={s.stage} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{s.stage}</span>
                            {isBottleneck && <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />{t('timeToFill.bottleneck')}</Badge>}
                          </div>
                          <div className="flex items-center gap-4 text-muted-foreground">
                            <span>Avg: {s.avgHours < 24 ? `${s.avgHours}h` : `${Math.round(s.avgHours / 24)}d`}</span>
                            <span>Median: {s.medianHours < 24 ? `${s.medianHours}h` : `${Math.round(s.medianHours / 24)}d`}</span>
                            <span>{s.count} transitions</span>
                            {s.dropOffRate > 0 && (
                              <Badge variant={s.dropOffRate > 50 ? "destructive" : "secondary"} className="text-xs">
                                <TrendingDown className="h-3 w-3 mr-1" />{s.dropOffRate}% drop-off
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="bg-muted rounded-full h-3">
                          <div className={`rounded-full h-3 ${isBottleneck ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Per-Job Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('timeToFill.timeToFillByJob')}</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('timeToFill.searchPlaceholder')}
                    value={jobSearchQuery}
                    onChange={(e) => setJobSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('timeToFill.allDepartments')}</SelectItem>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <SkeletonJobTable /> : jobMetrics.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {jobSearchQuery.trim()
                  ? `No jobs matching "${jobSearchQuery}" for the selected filters.`
                  : "No job data for the selected filters."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('timeToFill.jobTitle')}</TableHead>
                    <TableHead>{t('timeToFill.department')}</TableHead>
                    <TableHead>{t('timeToFill.daysToFill')}</TableHead>
                    <TableHead>{t('timeToFill.transitions')}</TableHead>
                    <TableHead>{t('timeToFill.hires')}</TableHead>
                    <TableHead>{t('timeToFill.posted')}</TableHead>
                    <TableHead>{t('timeToFill.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobMetrics.slice(0, 50).map(j => (
                    <TableRow key={j.job_id}>
                      <TableCell className="font-medium">{j.job_title}</TableCell>
                      <TableCell>{j.department}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{j.total_days}</span>
                          {j.total_days > overallAvgDays * 1.5 && <TrendingUp className="h-3 w-3 text-red-500" />}
                        </div>
                      </TableCell>
                      <TableCell>{j.applications}</TableCell>
                      <TableCell><Badge variant={j.hires > 0 ? "default" : "secondary"}>{j.hires}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground" title={j.created_at ? new Date(j.created_at).toLocaleString() : undefined}>
                        {j.created_at ? formatDistanceToNow(new Date(j.created_at), { addSuffix: true }) : "\u2014"}
                      </TableCell>
                      <TableCell>
                        {j.total_days > overallAvgDays * 1.5 ? (
                          <Badge variant="destructive">{t('timeToFill.slow')}</Badge>
                        ) : j.total_days < overallAvgDays * 0.5 ? (
                          <Badge className="bg-green-600">{t('timeToFill.fast')}</Badge>
                        ) : (
                          <Badge variant="secondary">{t('timeToFill.normal')}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
