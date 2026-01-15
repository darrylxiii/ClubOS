import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  History, CheckCircle, XCircle, Clock, RefreshCw, Search,
  Mail, Bell, UserPlus, Tag, Plus, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AutomationLog {
  id: string;
  automationName: string;
  status: 'success' | 'failed' | 'pending';
  action: string;
  prospectName: string;
  executedAt: string;
  duration: number;
  errorMessage?: string;
}

export function CRMAutomationLogs() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['crm-automation-logs'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('crm_automation_logs' as any)
        .select(`
          id,
          status,
          created_at,
          details,
          automation:crm_automations(name, actions),
          prospect:crm_prospects!triggered_by_record_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100) as any);

      if (error) throw error;

      return data.map((log: any) => {
        // Parse action type from the automation definition or log details
        const firstAction = log.automation?.actions?.[0]?.type || 'unknown';

        return {
          id: log.id,
          automationName: log.automation?.name || 'Unknown Automation',
          status: log.status,
          action: firstAction,
          prospectName: log.prospect ? `${log.prospect.first_name || ''} ${log.prospect.last_name || ''}`.trim() : 'Unknown Prospect',
          executedAt: log.created_at,
          duration: log.details?.duration || 0,
          errorMessage: log.details?.logs?.find((l: any) => l.error)?.error
        } as AutomationLog;
      });
    }
  });

  const filteredLogs = logs.filter(log => {
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (searchQuery && !log.automationName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !log.prospectName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'send_email': return <Mail className="h-4 w-4" />;
      case 'notify_user': return <Bell className="h-4 w-4" />;
      case 'assign_owner': return <UserPlus className="h-4 w-4" />;
      case 'update_stage': return <Tag className="h-4 w-4" />;
      case 'create_task': return <Plus className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const successCount = logs.filter(l => l.status === 'success').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Automation Logs
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="border-green-500 text-green-500">
                {successCount} Success
              </Badge>
              <Badge variant="outline" className="border-red-500 text-red-500">
                {failedCount} Failed
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {filteredLogs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 rounded-lg bg-background/50 border border-border/30 hover:border-border/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <p className="font-medium">{log.automationName}</p>
                      <p className="text-sm text-muted-foreground">
                        {log.prospectName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getActionIcon(log.action)}
                      {log.action.replace(/_/g, ' ')}
                    </Badge>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.executedAt), 'MMM d, h:mm a')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.duration}ms
                      </p>
                    </div>
                  </div>
                </div>
                {log.errorMessage && (
                  <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-500">{log.errorMessage}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
