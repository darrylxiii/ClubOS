import { useState } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { useAdminTracking } from '@/hooks/useAdminTracking';

interface ExportResult {
  table: string;
  rows: number;
  error?: string;
}

interface ExportResponse {
  success: boolean;
  downloadUrl?: string;
  zipData?: string;
  downloadMethod?: string;
  fileName: string;
  exportResults: ExportResult[];
  totalTables: number;
  successfulTables: number;
  totalRows: number;
  expiresIn?: string;
}

// Comprehensive list of known tables from schema
const KNOWN_TABLES = [
  'profiles', 'companies', 'jobs', 'applications', 'bookings',
  'candidate_profiles', 'experience', 'education', 'skills',
  'notifications', 'messages', 'payments', 'invoices', 'referrals',
  'teams', 'projects', 'tasks', 'activity_feed', 'admin_audit_activity',
  'achievement_progress', 'ai_conversations', 'ai_suggestions',
  'calendar_events', 'commission_entries', 'communication_logs',
  'contacts', 'crm_activities', 'deals', 'email_templates',
  'freelancer_teams', 'interview_schedules', 'job_boards',
  'meeting_recordings', 'notes', 'pipeline_stages', 'placement_fees',
  'proposals', 'talent_pools', 'time_entries', 'user_resumes',
  'video_meetings', 'workflow_runs', 'workspace_members'
].sort();

export default function DataExport() {
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const { trackDataExport } = useAdminTracking();

  const filteredTables = KNOWN_TABLES.filter(table => 
    table.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportMutation = useMutation({
    mutationFn: async (tables: string[]) => {
      const { data, error } = await supabase.functions.invoke('admin-bulk-export', {
        body: { tables: tables.length > 0 ? tables : undefined }
      });

      if (error) throw error;
      return data as ExportResponse;
    },
    onSuccess: async (data) => {
      if (data.downloadUrl) {
        // Open download URL
        window.open(data.downloadUrl, '_blank');
        toast.success(`Export complete: ${data.totalRows.toLocaleString()} rows from ${data.successfulTables} tables`);
      } else if (data.zipData && data.downloadMethod === 'base64') {
        // Download from base64
        const byteCharacters = atob(data.zipData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Export complete: ${data.totalRows.toLocaleString()} rows from ${data.successfulTables} tables`);
      }

      // Track export
      await trackDataExport('bulk_database_export', data.totalRows);
    },
    onError: (error: Error) => {
      toast.error('Export failed', { description: error.message });
    }
  });

  const handleSelectAll = () => {
    if (selectedTables.size === filteredTables.length) {
      setSelectedTables(new Set());
    } else {
      setSelectedTables(new Set(filteredTables));
    }
  };

  const handleToggleTable = (table: string) => {
    const newSelected = new Set(selectedTables);
    if (newSelected.has(table)) {
      newSelected.delete(table);
    } else {
      newSelected.add(table);
    }
    setSelectedTables(newSelected);
  };

  const handleExport = () => {
    const tables = Array.from(selectedTables);
    exportMutation.mutate(tables);
  };

  const handleExportAll = () => {
    exportMutation.mutate([]);
  };

  return (
    <RoleGate allowedRoles={['admin']}>
      <div className="container max-w-6xl py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Database className="h-8 w-8" />
                Data Export
              </h1>
              <p className="text-muted-foreground">
                Bulk export database tables as CSV files
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportAll}
                disabled={exportMutation.isPending}
              >
                {exportMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export All Tables
              </Button>
              <Button
                onClick={handleExport}
                disabled={selectedTables.size === 0 || exportMutation.isPending}
              >
                {exportMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                )}
                Export Selected ({selectedTables.size})
              </Button>
            </div>
          </div>

          {/* Export Progress */}
          {exportMutation.isPending && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="font-medium">Exporting tables...</span>
                  </div>
                  <Progress value={undefined} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    This may take a few moments depending on the amount of data.
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
                  Successfully exported {exportMutation.data.successfulTables} of {exportMutation.data.totalTables} tables
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 rounded-lg bg-background">
                    <div className="text-2xl font-bold">{exportMutation.data.totalTables}</div>
                    <div className="text-sm text-muted-foreground">Tables</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-background">
                    <div className="text-2xl font-bold">{exportMutation.data.totalRows.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Rows</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-background">
                    <div className="text-2xl font-bold">{exportMutation.data.expiresIn || 'Downloaded'}</div>
                    <div className="text-sm text-muted-foreground">Link Expires</div>
                  </div>
                </div>

                {exportMutation.data.exportResults.some(r => r.error) && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">Tables with errors:</p>
                    {exportMutation.data.exportResults
                      .filter(r => r.error)
                      .map(r => (
                        <div key={r.table} className="flex items-center gap-2 text-sm">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span>{r.table}: {r.error}</span>
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
              <CardDescription>
                Choose specific tables or export all database tables at once
              </CardDescription>
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
                <Button variant="outline" onClick={handleSelectAll}>
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
                <span>{selectedTables.size} of {filteredTables.length} tables selected</span>
                <span className="flex items-center gap-1">
                  <Badge variant="outline">{KNOWN_TABLES.length} known tables</Badge>
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
              <p>• All exports are packaged as a ZIP file containing individual CSV files per table</p>
              <p>• Maximum 50,000 rows per table to prevent memory issues</p>
              <p>• Download links expire after 24 hours</p>
              <p>• All exports are logged for audit purposes</p>
              <p>• Large exports may take several minutes to complete</p>
            </CardContent>
          </Card>
        </div>
      </RoleGate>
  );
}
