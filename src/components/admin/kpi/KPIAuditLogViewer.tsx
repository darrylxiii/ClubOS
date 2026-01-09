import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useKPIAuditSummary, useKPIAuditHistory } from '@/hooks/useKPIAuditLog';
import { History, Eye, Download, Settings, RefreshCw, Pin, Bell, ChevronDown, Users, Activity, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const actionIcons: Record<string, React.ReactNode> = {
  view: <Eye className="h-3 w-3" />,
  export: <Download className="h-3 w-3" />,
  configure: <Settings className="h-3 w-3" />,
  refresh: <RefreshCw className="h-3 w-3" />,
  pin: <Pin className="h-3 w-3" />,
  unpin: <Pin className="h-3 w-3 opacity-50" />,
  alert_config: <Bell className="h-3 w-3" />,
  drill_down: <ChevronDown className="h-3 w-3" />,
};

const actionColors: Record<string, string> = {
  view: 'bg-blue-500/20 text-blue-400',
  export: 'bg-purple-500/20 text-purple-400',
  configure: 'bg-amber-500/20 text-amber-400',
  refresh: 'bg-green-500/20 text-green-400',
  pin: 'bg-pink-500/20 text-pink-400',
  unpin: 'bg-muted text-muted-foreground',
  alert_config: 'bg-orange-500/20 text-orange-400',
  drill_down: 'bg-cyan-500/20 text-cyan-400',
};

export function KPIAuditLogViewer() {
  const [period, setPeriod] = useState<number>(30);
  const { data: summary, isLoading: summaryLoading } = useKPIAuditSummary(period);
  const { data: history, isLoading: historyLoading } = useKPIAuditHistory(50);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Actions</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {summaryLoading ? '...' : (summary?.total_actions || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Unique Users</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {summaryLoading ? '...' : (summary?.unique_users || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Views</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {summaryLoading ? '...' : (summary?.by_action_type?.view || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Exports</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {summaryLoading ? '...' : (summary?.by_action_type?.export || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Recent KPI Activity
          </CardTitle>
          <Select value={period.toString()} onValueChange={(v) => setPeriod(parseInt(v))}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {historyLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : history?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No activity recorded yet
              </p>
            ) : (
              <div className="space-y-2">
                {history?.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={`${actionColors[entry.action_type]} border-0`}>
                        {actionIcons[entry.action_type]}
                        <span className="ml-1 capitalize">{entry.action_type.replace('_', ' ')}</span>
                      </Badge>
                      {entry.kpi_name && (
                        <span className="text-sm font-medium">{entry.kpi_name}</span>
                      )}
                      {entry.domain && (
                        <Badge variant="outline" className="text-xs">
                          {entry.domain}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Top KPIs */}
      {summary?.top_kpis && summary.top_kpis.length > 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Most Viewed KPIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.top_kpis.slice(0, 5).map((kpi, idx) => (
                <div key={kpi.kpi_name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                    <span className="text-sm">{kpi.kpi_name}</span>
                  </div>
                  <Badge variant="secondary">{kpi.count} views</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
