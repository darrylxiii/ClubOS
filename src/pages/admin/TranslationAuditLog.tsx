import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import RoleGate from '@/components/RoleGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { History, Search, Eye, Download, RefreshCw } from 'lucide-react';
import { useTranslationAuditLog, useAuditLogStats } from '@/hooks/use-translation-audit';
import { useTranslationNamespaces, useActiveLanguages } from '@/hooks/use-translation-namespaces';

export default function TranslationAuditLog() {
  const [filters, setFilters] = useState({
    namespace: '',
    language: '',
    action: '',
    limit: 100,
  });
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  
  const { data: namespaces } = useTranslationNamespaces();
  const { data: languages } = useActiveLanguages();
  const { data: auditLog, isLoading, refetch } = useTranslationAuditLog(filters);
  const { data: stats } = useAuditLogStats();
  
  const handleExport = () => {
    if (!auditLog) return;
    
    const csv = [
      ['Timestamp', 'Namespace', 'Language', 'Key', 'Action', 'Old Value', 'New Value'].join(','),
      ...auditLog.map(entry => [
        entry.changed_at,
        entry.namespace,
        entry.language,
        entry.key_path,
        entry.action,
        `"${(entry.old_value || '').replace(/"/g, '""')}"`,
        `"${(entry.new_value || '').replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translation-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <Badge variant="default" className="bg-green-500">Create</Badge>;
      case 'update':
        return <Badge variant="secondary">Update</Badge>;
      case 'delete':
        return <Badge variant="destructive">Delete</Badge>;
      case 'generate':
        return <Badge variant="outline">AI Generated</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };
  
  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <History className="h-6 w-6" />
                Translation Audit Log
              </h1>
              <p className="text-muted-foreground">
                Track all translation changes and AI generations
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats?.today || 0}</div>
                <div className="text-sm text-muted-foreground">Changes Today</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats?.thisWeek || 0}</div>
                <div className="text-sm text-muted-foreground">This Week</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <div className="text-sm text-muted-foreground">Total Changes</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-4 flex-wrap">
                <Select
                  value={filters.namespace}
                  onValueChange={(v) => setFilters({ ...filters, namespace: v === 'all' ? '' : v })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Namespace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Namespaces</SelectItem>
                    {namespaces?.map(ns => (
                      <SelectItem key={ns.namespace} value={ns.namespace}>
                        {ns.namespace}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  value={filters.language}
                  onValueChange={(v) => setFilters({ ...filters, language: v === 'all' ? '' : v })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    {languages?.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  value={filters.action}
                  onValueChange={(v) => setFilters({ ...filters, action: v === 'all' ? '' : v })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="generate">AI Generated</SelectItem>
                  </SelectContent>
                </Select>
                
                <Badge variant="secondary" className="h-10 px-4 flex items-center">
                  {auditLog?.length || 0} entries
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          {/* Audit Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : auditLog?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No audit entries found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Namespace</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog?.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(entry.changed_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.namespace}</Badge>
                        </TableCell>
                        <TableCell>{entry.language.toUpperCase()}</TableCell>
                        <TableCell className="font-mono text-sm max-w-[200px] truncate">
                          {entry.key_path}
                        </TableCell>
                        <TableCell>{getActionBadge(entry.action)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEntry(entry)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          
          {/* Detail Dialog */}
          <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Change Details</DialogTitle>
              </DialogHeader>
              {selectedEntry && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Namespace</div>
                      <div>{selectedEntry.namespace}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Language</div>
                      <div>{selectedEntry.language}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Key</div>
                      <div className="font-mono text-sm">{selectedEntry.key_path}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Action</div>
                      {getActionBadge(selectedEntry.action)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Old Value</div>
                    <div className="p-3 bg-destructive/10 rounded border text-sm">
                      {selectedEntry.old_value || '(empty)'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">New Value</div>
                    <div className="p-3 bg-green-500/10 rounded border text-sm">
                      {selectedEntry.new_value || '(empty)'}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Changed at {format(new Date(selectedEntry.changed_at), 'PPpp')}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
