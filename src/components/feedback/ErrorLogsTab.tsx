import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/lib/notify';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { Search, AlertCircle, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ErrorLog {
  id: string;
  user_id: string | null;
  error_type: string;
  severity: string;
  error_message: string;
  error_stack: string | null;
  component_name: string | null;
  page_url: string;
  user_agent: string;
  metadata: any;
  resolved: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export const ErrorLogsTab = () => {
  const { t } = useTranslation('common');
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [filteredErrors, setFilteredErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [resolvedFilter, setResolvedFilter] = useState<string>('all');
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadErrors();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('error_logs_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'error_logs' 
      }, () => {
        loadErrors();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadErrors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Fetch user profiles separately
      const errorsWithProfiles = await Promise.all(
        (data || []).map(async (errorLog) => {
          if (errorLog.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', errorLog.user_id)
              .single();
            
            return { ...errorLog, profiles: profile || undefined } as ErrorLog;
          }
          return errorLog as ErrorLog;
        })
      );
      
      setErrors(errorsWithProfiles);
      setFilteredErrors(errorsWithProfiles);
    } catch (error: unknown) {
      console.error('Error loading error logs:', error);
      toast({
        title: t('feedbackSection.errorlogstab.failedToLoadErrorLogs', 'Failed to load error logs'),
        description: error instanceof Error ? error.message : t('feedbackSection.errorlogstab.anUnexpectedErrorOccurred', 'An unexpected error occurred'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = errors;

    if (searchTerm) {
      filtered = filtered.filter(
        (e) =>
          e.error_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.component_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.page_url.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter((e) => e.severity === severityFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((e) => e.error_type === typeFilter);
    }

    if (resolvedFilter !== 'all') {
      filtered = filtered.filter((e) => e.resolved === (resolvedFilter === 'resolved'));
    }

    setFilteredErrors(filtered);
  }, [searchTerm, severityFilter, typeFilter, resolvedFilter, errors]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const handleMarkResolved = async (errorId: string, resolved: boolean) => {
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({ resolved })
        .eq('id', errorId);

      if (error) throw error;

      toast({
        title: resolved ? t('feedbackSection.errorlogstab.markedAsResolved', 'Marked as resolved') : t('feedbackSection.errorlogstab.markedAsUnresolved', 'Marked as unresolved'),
      });
      loadErrors();
    } catch (error: unknown) {
      console.error('Error updating error log:', error);
      toast({
        title: t('feedbackSection.errorlogstab.failedToUpdate', 'Failed to update'),
        description: error instanceof Error ? error.message : t('feedbackSection.errorlogstab.anUnexpectedErrorOccurred', 'An unexpected error occurred'),
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (error: ErrorLog) => {
    setSelectedError(error);
    setDetailsOpen(true);
  };

  const stats = {
    total: errors.length,
    critical: errors.filter((e) => e.severity === 'critical').length,
    errors: errors.filter((e) => e.severity === 'error').length,
    unresolved: errors.filter((e) => !e.resolved).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('feedbackSection.totalErrors')}</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('feedbackSection.critical')}</CardDescription>
            <CardTitle className="text-3xl text-destructive">{stats.critical}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('feedbackSection.errors')}</CardDescription>
            <CardTitle className="text-3xl text-destructive">{stats.errors}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('feedbackSection.unresolved')}</CardDescription>
            <CardTitle className="text-3xl text-yellow-500">{stats.unresolved}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('feedbackSection.errorLogs')}</CardTitle>
          <CardDescription>{t('feedbackSection.monitorAndResolveApplicationErrors')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('feedbackSection.searchErrors')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('feedbackSection.severity')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('feedbackSection.errorlogstab.allSeverities', 'All Severities')}</SelectItem>
                <SelectItem value="critical">{t('feedbackSection.errorlogstab.critical', 'Critical')}</SelectItem>
                <SelectItem value="error">{t('feedbackSection.errorlogstab.error', 'Error')}</SelectItem>
                <SelectItem value="warning">{t('feedbackSection.errorlogstab.warning', 'Warning')}</SelectItem>
                <SelectItem value="info">{t('feedbackSection.errorlogstab.info', 'Info')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('feedbackSection.type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('feedbackSection.errorlogstab.allTypes', 'All Types')}</SelectItem>
                <SelectItem value="react">{t('feedbackSection.errorlogstab.react', 'React')}</SelectItem>
                <SelectItem value="api">{t('feedbackSection.errorlogstab.api', 'API')}</SelectItem>
                <SelectItem value="edge_function">{t('feedbackSection.errorlogstab.edgeFunction', 'Edge Function')}</SelectItem>
                <SelectItem value="database">{t('feedbackSection.errorlogstab.database', 'Database')}</SelectItem>
                <SelectItem value="network">{t('feedbackSection.errorlogstab.network', 'Network')}</SelectItem>
                <SelectItem value="unknown">{t('feedbackSection.errorlogstab.unknown', 'Unknown')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('feedbackSection.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('feedbackSection.errorlogstab.allStatus', 'All Status')}</SelectItem>
                <SelectItem value="unresolved">{t('feedbackSection.errorlogstab.unresolved', 'Unresolved')}</SelectItem>
                <SelectItem value="resolved">{t('feedbackSection.errorlogstab.resolved', 'Resolved')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('feedbackSection.errorlogstab.severity', 'Severity')}</TableHead>
                  <TableHead>{t('feedbackSection.errorlogstab.type', 'Type')}</TableHead>
                  <TableHead>{t('feedbackSection.errorlogstab.errorMessage', 'Error Message')}</TableHead>
                  <TableHead>{t('feedbackSection.errorlogstab.component', 'Component')}</TableHead>
                  <TableHead>{t('feedbackSection.errorlogstab.time', 'Time')}</TableHead>
                  <TableHead>{t('feedbackSection.errorlogstab.status', 'Status')}</TableHead>
                  <TableHead className="text-right">{t('feedbackSection.errorlogstab.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredErrors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t('feedbackSection.errorlogstab.noErrorsFound', 'No errors found')}</TableCell>
                  </TableRow>
                ) : (
                  filteredErrors.map((error) => (
                    <TableRow key={error.id}>
                      <TableCell>
                        <Badge variant={getSeverityColor(error.severity) as any} className="gap-1">
                          {getSeverityIcon(error.severity)}
                          {error.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{error.error_type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {error.error_message}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {error.component_name || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {error.resolved ? (
                            <Badge variant="default" className="bg-green-500 gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {t('feedbackSection.errorlogstab.resolved', 'Resolved')}
                            </Badge>
                        ) : (
                          <Badge variant="secondary">{t('feedbackSection.errorlogstab.unresolved', 'Unresolved')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(error)}
                          >
                            {t('feedbackSection.errorlogstab.details', 'Details')}
                          </Button>
                          <Button
                            size="sm"
                            variant={error.resolved ? 'outline' : 'default'}
                            onClick={() => handleMarkResolved(error.id, !error.resolved)}
                          >
                            {error.resolved ? t('feedbackSection.errorlogstab.unresolve', 'Unresolve') : t('feedbackSection.errorlogstab.resolve', 'Resolve')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Error Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t('feedbackSection.errorDetails')}</DialogTitle>
            <DialogDescription>{t('feedbackSection.fullErrorInformationAndStackTrace')}</DialogDescription>
          </DialogHeader>
          {selectedError && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">{t('feedbackSection.errorlogstab.severity', 'Severity')}</div>
                    <Badge variant={getSeverityColor(selectedError.severity) as any} className="mt-1">
                      {selectedError.severity}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">{t('feedbackSection.errorlogstab.type', 'Type')}</div>
                    <Badge variant="outline" className="mt-1">{selectedError.error_type}</Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">{t('feedbackSection.errorlogstab.component', 'Component')}</div>
                    <div className="mt-1">{selectedError.component_name || t('feedbackSection.errorlogstab.unknown', 'Unknown')}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">{t('feedbackSection.errorlogstab.time', 'Time')}</div>
                    <div className="mt-1 text-sm">
                      {formatDistanceToNow(new Date(selectedError.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">{t('feedbackSection.errorlogstab.user', 'User')}</div>
                  <div className="text-sm">
                    {selectedError.profiles?.full_name || t('feedbackSection.errorlogstab.guest', 'Guest')} 
                    {selectedError.profiles?.email && ` (${selectedError.profiles.email})`}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">{t('feedbackSection.errorlogstab.errorMessage', 'Error Message')}</div>
                  <div className="text-sm bg-muted/30 p-3 rounded-lg font-mono">
                    {selectedError.error_message}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">{t('feedbackSection.errorlogstab.pageUrl', 'Page URL')}</div>
                  <div className="text-sm bg-muted/30 p-3 rounded-lg break-all">
                    {selectedError.page_url}
                  </div>
                </div>

                {selectedError.error_stack && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">{t('feedbackSection.errorlogstab.stackTrace', 'Stack Trace')}</div>
                    <pre className="text-xs bg-muted/30 p-3 rounded-lg overflow-auto max-h-64 font-mono">
                      {selectedError.error_stack}
                    </pre>
                  </div>
                )}

                {selectedError.metadata && Object.keys(selectedError.metadata).length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Metadata</div>
                    <pre className="text-xs bg-muted/30 p-3 rounded-lg overflow-auto max-h-32 font-mono">
                      {JSON.stringify(selectedError.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">User Agent</div>
                  <div className="text-xs bg-muted/30 p-3 rounded-lg break-all">
                    {selectedError.user_agent}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
