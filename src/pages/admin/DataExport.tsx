import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RoleGate } from '@/components/RoleGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Download,
  Database,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
} from 'lucide-react';
import { useAdminTracking } from '@/hooks/useAdminTracking';

interface ExportResult {
  table: string;
  rows: number;
  parts: number;
  error?: string;
}

interface ExportFile {
  table: string;
  part: number;
  rows: number;
  path: string;
  signedUrl: string;
}

interface ExportResponse {
  success: boolean;
  exportResults: ExportResult[];
  files: ExportFile[];
  maxTablesPerCall: number;
  totalTables: number;
  successfulTables: number;
  totalRows: number;
  expiresIn?: string;
}

function downloadUrl(url: string, filename?: string) {
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function DataExport() {
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [exportAllProgress, setExportAllProgress] = useState<{
    running: boolean;
    total: number;
    done: number;
    totalRows: number;
  }>({ running: false, total: 0, done: 0, totalRows: 0 });

  const { trackDataExport } = useAdminTracking();

  const { data: allTables = [], isLoading: tablesLoading, refetch: refetchTables } = useQuery({
    queryKey: ['public-tables'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_tables');
      if (error) throw error;
      return (data as { table_name: string }[]).map((t) => t.table_name).sort();
    },
  });

  const filteredTables = useMemo(
    () => allTables.filter((t) => t.toLowerCase().includes(searchQuery.toLowerCase())),
    [allTables, searchQuery],
  );

  const exportMutation = useMutation({
    mutationFn: async (tables: string[]) => {
      const { data, error } = await supabase.functions.invoke('admin-bulk-export', {
        body: { tables: tables.length > 0 ? tables : undefined },
      });

      if (error) throw error;
      return data as ExportResponse;
    },
    onSuccess: async (data) => {
      // Download CSV parts
      for (const f of data.files) {
        const filename = `${f.table}${data.files.filter((x) => x.table === f.table).length > 1 ? `__part${String(f.part).padStart(3, '0')}` : ''}.csv`;
        downloadUrl(f.signedUrl, filename);
      }

      toast.success(
        `Export complete: ${data.totalRows.toLocaleString()} rows from ${data.successfulTables} tables`,
      );

      await trackDataExport('bulk_database_export', data.totalRows);
    },
    onError: (error: Error) => {
      toast.error('Export failed', { description: error.message });
    },
  });

  const handleSelectAll = () => {
    if (selectedTables.size === filteredTables.length) {
      setSelectedTables(new Set());
    } else {
      setSelectedTables(new Set(filteredTables));
    }
  };

  const handleToggleTable = (table: string) => {
    const next = new Set(selectedTables);
    if (next.has(table)) next.delete(table);
    else next.add(table);
    setSelectedTables(next);
  };

  const handleExport = () => {
    exportMutation.mutate(Array.from(selectedTables));
  };

  const handleExportAll = async () => {
    if (allTables.length === 0) return;

    const chunkSize = 10;
    setExportAllProgress({ running: true, total: allTables.length, done: 0, totalRows: 0 });

    try {
      let done = 0;
      let totalRows = 0;

      for (let i = 0; i < allTables.length; i += chunkSize) {
        const chunk = allTables.slice(i, i + chunkSize);

        const { data, error } = await supabase.functions.invoke('admin-bulk-export', {
          body: { tables: chunk },
        });

        if (error) throw error;

        const resp = data as ExportResponse;

        for (const f of resp.files) {
          const filename = `${f.table}${resp.files.filter((x) => x.table === f.table).length > 1 ? `__part${String(f.part).padStart(3, '0')}` : ''}.csv`;
          downloadUrl(f.signedUrl, filename);
        }

        done += chunk.length;
        totalRows += resp.totalRows;
        setExportAllProgress({ running: true, total: allTables.length, done, totalRows });
      }

      toast.success(`Exported ${totalRows.toLocaleString()} rows across ${allTables.length} tables`);
      await trackDataExport('bulk_database_export_all', totalRows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('Export all failed', { description: msg });
    } finally {
      setExportAllProgress((p) => ({ ...p, running: false }));
    }
  };

  const isBusy = exportMutation.isPending || exportAllProgress.running;

  return (
    <RoleGate allowedRoles={['admin']}>
      <div className="container max-w-6xl py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8" />
              Data Export
            </h1>
            <p className="text-muted-foreground">Bulk export database tables as CSV files</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportAll} disabled={isBusy || tablesLoading}>
              {exportAllProgress.running ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export All Tables
            </Button>
            <Button onClick={handleExport} disabled={selectedTables.size === 0 || isBusy}>
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Export Selected ({selectedTables.size})
            </Button>
          </div>
        </div>

        {/* Export All Progress */}
        {exportAllProgress.running && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-medium">Exporting all tables…</span>
                  <span className="text-sm text-muted-foreground">
                    {exportAllProgress.done}/{exportAllProgress.total}
                  </span>
                </div>
                <Progress
                  value={
                    exportAllProgress.total > 0
                      ? (exportAllProgress.done / exportAllProgress.total) * 100
                      : 0
                  }
                  className="h-2"
                />
                <p className="text-sm text-muted-foreground">
                  Downloading CSVs in batches to handle large datasets.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Results */}
        {exportMutation.isSuccess && exportMutation.data && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Export Complete
              </CardTitle>
              <CardDescription>
                Successfully exported {exportMutation.data.successfulTables} of{' '}
                {exportMutation.data.totalTables} tables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 rounded-lg bg-background">
                  <div className="text-2xl font-bold">{exportMutation.data.totalTables}</div>
                  <div className="text-sm text-muted-foreground">Tables</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-background">
                  <div className="text-2xl font-bold">
                    {exportMutation.data.totalRows.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Rows</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-background">
                  <div className="text-2xl font-bold">{exportMutation.data.expiresIn || '24h'}</div>
                  <div className="text-sm text-muted-foreground">Link Expires</div>
                </div>
              </div>

              {exportMutation.data.exportResults.some((r) => r.error) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">Tables with errors:</p>
                  {exportMutation.data.exportResults
                    .filter((r) => r.error)
                    .map((r) => (
                      <div key={r.table} className="flex items-center gap-2 text-sm">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span>
                          {r.table}: {r.error}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Table Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Tables to Export</CardTitle>
            <CardDescription>Choose specific tables or export everything</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={handleSelectAll} disabled={isBusy}>
                {selectedTables.size === filteredTables.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <ScrollArea className="h-[400px] rounded-md border p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredTables.map((table) => (
                  <div
                    key={table}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedTables.has(table)
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleToggleTable(table)}
                  >
                    <Checkbox
                      checked={selectedTables.has(table)}
                      onCheckedChange={() => handleToggleTable(table)}
                    />
                    <span className="text-sm font-mono truncate">{table}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {selectedTables.size} of {filteredTables.length} tables selected
              </span>
              <span className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchTables()}
                  disabled={tablesLoading || isBusy}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${tablesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Badge variant="outline">{tablesLoading ? 'Loading…' : `${allTables.length} tables`}</Badge>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Export Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Exports are generated as CSV files (large tables are split into multiple parts)</p>
            <p>• Export All runs in batches to avoid timeouts and memory limits</p>
            <p>• Download links expire after 24 hours</p>
            <p>• All exports are logged for audit purposes</p>
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
