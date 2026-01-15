import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Search, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { EmptyState } from '@/components/EmptyState';

interface ErrorLog {
  id: string;
  error_type: string;
  message: string;
  stack_trace: string | null;
  user_id: string | null;
  page_url: string | null;
  severity: 'info' | 'warning' | 'error' | 'critical';
  resolved: boolean;
  created_at: string;
  metadata: Record<string, any>;
}

const SEVERITY_CONFIG = {
  critical: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  error: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
};

export default function ErrorLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const { data: errorLogs, isLoading, refetch } = useQuery({
    queryKey: ['error-logs', severityFilter],
    queryFn: async () => {
      let query = supabase
        .from('error_analytics_summary')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  const { data: errorStats } = useQuery({
    queryKey: ['error-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('error_analytics_summary')
        .select('severity')
        .limit(1000);
      
      if (error) return { total: 0, critical: 0, error: 0, warning: 0, info: 0 };
      
      const logs = data || [];
      return {
        total: logs.length,
        critical: logs.filter((l: any) => l.severity === 'critical').length,
        error: logs.filter((l: any) => l.severity === 'error').length,
        warning: logs.filter((l: any) => l.severity === 'warning').length,
        info: logs.filter((l: any) => l.severity === 'info').length,
      };
    }
  });

  const filteredLogs = errorLogs?.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.error_type?.toLowerCase().includes(query) ||
      log.message?.toLowerCase().includes(query) ||
      log.page_url?.toLowerCase().includes(query)
    );
  });

  return (
    <AppLayout>
      <RoleGate allowedRoles={["admin"]} showLoading>
        <div className="container mx-auto py-8 max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <h1 className="text-3xl font-bold">Error Logs</h1>
                <p className="text-muted-foreground">
                  Application error tracking and debugging
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Errors</p>
                <p className="text-2xl font-bold">{errorStats?.total || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-red-500/50">
              <CardContent className="pt-6">
                <p className="text-sm text-red-500">Critical</p>
                <p className="text-2xl font-bold text-red-500">{errorStats?.critical || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-orange-500/50">
              <CardContent className="pt-6">
                <p className="text-sm text-orange-500">Errors</p>
                <p className="text-2xl font-bold text-orange-500">{errorStats?.error || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-500/50">
              <CardContent className="pt-6">
                <p className="text-sm text-yellow-500">Warnings</p>
                <p className="text-2xl font-bold text-yellow-500">{errorStats?.warning || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-blue-500/50">
              <CardContent className="pt-6">
                <p className="text-sm text-blue-500">Info</p>
                <p className="text-2xl font-bold text-blue-500">{errorStats?.info || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search errors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Tabs value={severityFilter} onValueChange={setSeverityFilter}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="critical">Critical</TabsTrigger>
                    <TabsTrigger value="error">Error</TabsTrigger>
                    <TabsTrigger value="warning">Warning</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Error List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>
                Showing {filteredLogs?.length || 0} errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading errors...</div>
              ) : filteredLogs && filteredLogs.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {filteredLogs.map((log: any) => {
                      const config = SEVERITY_CONFIG[log.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
                      const Icon = config.icon;
                      
                      return (
                        <div 
                          key={log.id}
                          className={`p-4 border rounded-lg ${config.bg}`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={config.color}>
                                  {log.severity?.toUpperCase()}
                                </Badge>
                                <span className="text-sm font-medium truncate">
                                  {log.error_type || 'Unknown Error'}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {log.message || 'No message provided'}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {log.created_at ? format(new Date(log.created_at), 'MMM d, HH:mm:ss') : 'Unknown time'}
                                </span>
                                {log.page_url && (
                                  <span className="truncate max-w-[200px]">
                                    {log.page_url}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge variant={log.resolved ? 'secondary' : 'destructive'}>
                              {log.resolved ? 'Resolved' : 'Open'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title="No Errors Found"
                  description="Everything is running smoothly. No errors have been logged."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
