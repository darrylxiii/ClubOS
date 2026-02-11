import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CRMEmptyState } from '@/components/crm/CRMEmptyState';

interface ImportLog {
  id: string;
  campaign_id: string;
  campaign_name?: string;
  file_name: string;
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errors?: any;
  error_message?: string;
  imported_by: string;
  imported_by_name?: string;
  created_at: string;
  completed_at?: string;
}

export default function ImportHistory() {
  const [imports, setImports] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImports();
  }, []);

  const fetchImports = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_import_logs')
        .select(`
          *,
          campaign:crm_campaigns(name),
          importer:profiles!crm_import_logs_imported_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setImports((data || []).map(item => ({
        id: item.id,
        campaign_id: item.campaign_id,
        campaign_name: (item.campaign as Record<string, any> | null)?.name,
        file_name: item.file_name || 'Unknown file',
        total_rows: item.total_rows || 0,
        imported_rows: item.imported_rows || 0,
        failed_rows: item.failed_rows || 0,
        status: item.status as ImportLog['status'],
        errors: item.errors,
        error_message: item.error_message,
        imported_by: item.imported_by,
        imported_by_name: (item.importer as Record<string, any> | null)?.full_name,
        created_at: item.created_at,
        completed_at: item.completed_at,
      })));
    } catch (error) {
      console.error('Error fetching imports:', error);
      toast.error('Failed to load import history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ImportLog['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const handleDownloadErrors = (importLog: ImportLog) => {
    if (!importLog.errors) {
      toast.info('No error details available');
      return;
    }

    const errorData = JSON.stringify(importLog.errors, null, 2);
    const blob = new Blob([errorData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${importLog.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Upload className="w-6 h-6" />
                Import History
              </h1>
              <p className="text-sm text-muted-foreground">
                View and manage your CSV imports
              </p>
            </div>
            <Button onClick={fetchImports} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </motion.div>

          {/* Import List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : imports.length === 0 ? (
            <CRMEmptyState
              type="no-campaigns"
            />
          ) : (
            <div className="space-y-4">
              {imports.map((importLog, index) => (
                <motion.div
                  key={importLog.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-primary/10">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{importLog.file_name}</h3>
                              {getStatusBadge(importLog.status)}
                            </div>
                            {importLog.campaign_name && (
                              <p className="text-sm text-muted-foreground">
                                Campaign: {importLog.campaign_name}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-muted-foreground">
                                {importLog.total_rows} total rows
                              </span>
                              <span className="text-emerald-500">
                                {importLog.imported_rows} imported
                              </span>
                              {importLog.failed_rows > 0 && (
                                <span className="text-red-500">
                                  {importLog.failed_rows} failed
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Imported by {importLog.imported_by_name || 'Unknown'} •{' '}
                              {format(new Date(importLog.created_at), 'PPp')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {importLog.failed_rows > 0 && importLog.errors && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadErrors(importLog)}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Errors
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Error summary */}
                      {importLog.status === 'failed' && importLog.error_message && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-red-400">Import Failed</p>
                              <p className="text-xs text-red-400/80 mt-1">
                                {importLog.error_message}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </RoleGate>
    </AppLayout>
  );
}
