import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  RefreshCw,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  SkipForward,
  Clock,
  Leaf,
  AlertTriangle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

interface GreenhouseJob {
  id: number;
  name: string;
  status: string;
  departments: string[];
  offices: string[];
  opened_at: string | null;
  closed_at: string | null;
}

interface SyncResult {
  found: number;
  created: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
  dryRun: boolean;
}

interface ImportLog {
  id: string;
  admin_id: string;
  job_ids: number[] | null;
  total_candidates: number;
  imported_count: number;
  skipped_count: number;
  failed_count: number;
  errors: string[] | null;
  started_at: string;
  completed_at: string | null;
}

export default function GreenhouseSyncPanel() {
  const [jobs, setJobs] = useState<GreenhouseJob[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set());
  const [includeRejected, setIncludeRejected] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetchingJobs, setFetchingJobs] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    const { data } = await supabase
      .from('greenhouse_import_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20);
    if (data) setLogs(data as unknown as ImportLog[]);
  }

  async function fetchJobs() {
    setFetchingJobs(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in first.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('sync-greenhouse-candidates', {
        body: { mode: 'list_jobs' },
      });

      if (error) throw error;
      setJobs(data.jobs || []);
      toast.success(`Loaded ${data.jobs?.length || 0} Greenhouse jobs.`);
    } catch (err: any) {
      toast.error(`Failed to load jobs: ${err.message}`);
    } finally {
      setFetchingJobs(false);
    }
  }

  async function runSync() {
    setLoading(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in first.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('sync-greenhouse-candidates', {
        body: {
          mode: 'sync',
          job_ids: selectedJobs.size > 0 ? Array.from(selectedJobs) : [],
          dry_run: dryRun,
          include_rejected: includeRejected,
          page_size: 100,
        },
      });

      if (error) throw error;
      setResult(data as SyncResult);
      if (!dryRun) fetchLogs();
      toast.success(dryRun ? 'Dry run complete.' : 'Import complete.');
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function toggleJob(id: number) {
    setSelectedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedJobs(new Set(filteredJobs.map((j) => j.id)));
  }

  function deselectAll() {
    setSelectedJobs(new Set());
  }

  const filteredJobs = jobs.filter(
    (j) =>
      j.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      j.departments.some((d) => d.toLowerCase().includes(searchFilter.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Greenhouse Pipeline Sync</h2>
          <p className="text-sm text-muted-foreground">
            Import candidates from Greenhouse job pipelines into TQC.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchJobs} disabled={fetchingJobs}>
          <RefreshCw className={`mr-2 h-4 w-4 ${fetchingJobs ? 'animate-spin' : ''}`} />
          {fetchingJobs ? 'Loading...' : 'Load Greenhouse Jobs'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Job Selector */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Jobs</CardTitle>
            <CardDescription>
              Choose which Greenhouse jobs to import candidates from. Leave empty to import all.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Click "Load Greenhouse Jobs" to fetch available pipelines.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter jobs..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="h-8"
                  />
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    None
                  </Button>
                </div>
                <ScrollArea className="h-[300px] pr-2">
                  <div className="space-y-1">
                    {filteredJobs.map((job) => (
                      <label
                        key={job.id}
                        className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={selectedJobs.has(job.id)}
                          onCheckedChange={() => toggleJob(job.id)}
                        />
                        <span className="flex-1 truncate">{job.name}</span>
                        <Badge variant={job.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                          {job.status}
                        </Badge>
                        {job.departments.length > 0 && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {job.departments[0]}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedJobs.size} of {filteredJobs.length} jobs selected
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Options + Trigger */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Import Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm">Include rejected</label>
                <Switch checked={includeRejected} onCheckedChange={setIncludeRejected} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm">Dry run (preview)</label>
                <Switch checked={dryRun} onCheckedChange={setDryRun} />
              </div>
              {dryRun && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Leaf className="h-3 w-3" /> No data will be written.
                </p>
              )}
              <Separator />
              <Button className="w-full" onClick={runSync} disabled={loading}>
                <Download className={`mr-2 h-4 w-4 ${loading ? 'animate-bounce' : ''}`} />
                {loading ? 'Syncing...' : dryRun ? 'Preview Import' : 'Run Import'}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {result.dryRun ? 'Preview' : 'Import'} Results
                  {result.dryRun && <Badge variant="outline">dry run</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span>Found: {result.found}</span>
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Created: {result.created}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <SkipForward className="h-4 w-4" />
                  <span>Skipped (duplicates): {result.skipped}</span>
                </div>
                {result.errors > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span>Errors: {result.errors}</span>
                  </div>
                )}
                {result.errorDetails.length > 0 && (
                  <ScrollArea className="h-[100px] mt-2 rounded border p-2">
                    {result.errorDetails.map((e, i) => (
                      <p key={i} className="text-xs text-destructive">
                        {e}
                      </p>
                    ))}
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Import History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Import History</CardTitle>
          <CardDescription>Recent Greenhouse sync operations.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No imports yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-md border px-4 py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(log.started_at), 'MMM d, yyyy HH:mm')}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-primary">+{log.imported_count}</span>
                    <span className="text-muted-foreground">~{log.skipped_count}</span>
                    {log.failed_count > 0 && (
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        {log.failed_count}
                      </span>
                    )}
                    <Badge variant={log.completed_at ? 'default' : 'secondary'}>
                      {log.completed_at ? 'done' : 'running'}
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
