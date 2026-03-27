import { useState } from "react";
import { Webhook, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, Eye, RotateCcw, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecharts } from "@/hooks/useRecharts";
import { format, subDays } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from 'react-i18next';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--warning))'];

interface WebhookDLQItem {
  id: string;
  webhook_id: string;
  endpoint_url: string;
  payload: any;
  headers: any;
  http_status: number | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  last_retry_at: string | null;
  status: string;
  created_at: string;
}

interface WebhookStats {
  id: string;
  webhook_id: string;
  endpoint_url: string;
  date: string;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  avg_response_time_ms: number | null;
  last_success_at: string | null;
  last_failure_at: string | null;
}

export const WebhookReliabilityDashboard = () => {
  const { t } = useTranslation('admin');
  const [selectedItem, setSelectedItem] = useState<WebhookDLQItem | null>(null);
  const queryClient = useQueryClient();
  const { recharts, isLoading: rechartsLoading } = useRecharts();

  const { data: dlqItems, isLoading: dlqLoading } = useQuery({
    queryKey: ['webhook-dlq'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_dead_letter_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as WebhookDLQItem[];
    },
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
    staleTime: 60000,
  });

  const { data: webhookStats, isLoading: statsLoading } = useQuery({
    queryKey: ['webhook-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_delivery_stats')
        .select('*')
        .gte('date', format(subDays(new Date(), 7), 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;
      return data as WebhookStats[];
    },
    refetchInterval: 300000,
    refetchIntervalInBackground: false,
    staleTime: 150000,
  });

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('webhook_dead_letter_queue')
        .update({ 
          status: 'pending',
          next_retry_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-dlq'] });
      toast.success(t('webhooks.webhookReliabilityDashboard.webhookQueuedForRetry'));
    },
    onError: () => {
      toast.error(t('webhooks.webhookReliabilityDashboard.failedToRetryWebhook'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('webhook_dead_letter_queue')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-dlq'] });
      toast.success(t('webhooks.webhookReliabilityDashboard.webhookRemovedFromDlq'));
    },
  });

  // Aggregate stats
  const pendingCount = dlqItems?.filter(i => i.status === 'pending').length || 0;
  const failedCount = dlqItems?.filter(i => i.status === 'failed').length || 0;
  const totalDeliveries = webhookStats?.reduce((acc, s) => acc + s.total_deliveries, 0) || 0;
  const successfulDeliveries = webhookStats?.reduce((acc, s) => acc + s.successful_deliveries, 0) || 0;
  const successRate = totalDeliveries ? ((successfulDeliveries / totalDeliveries) * 100).toFixed(1) : '100';

  // Chart data
  const dailyStats = webhookStats?.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = { date: item.date, success: 0, failed: 0 };
    }
    acc[item.date].success += item.successful_deliveries;
    acc[item.date].failed += item.failed_deliveries;
    return acc;
  }, {} as Record<string, { date: string; success: number; failed: number }>);

  const chartData = Object.values(dailyStats || {}).slice(-7);

  // Endpoint health
  const endpointHealth = webhookStats?.reduce((acc, item) => {
    if (!acc[item.endpoint_url]) {
      acc[item.endpoint_url] = { 
        endpoint: item.endpoint_url, 
        total: 0, 
        success: 0, 
        avgResponseTime: 0,
        lastSuccess: null as string | null,
        lastFailure: null as string | null,
      };
    }
    acc[item.endpoint_url].total += item.total_deliveries;
    acc[item.endpoint_url].success += item.successful_deliveries;
    if (item.avg_response_time_ms) {
      acc[item.endpoint_url].avgResponseTime = item.avg_response_time_ms;
    }
    if (item.last_success_at && (!acc[item.endpoint_url].lastSuccess || item.last_success_at > acc[item.endpoint_url].lastSuccess!)) {
      acc[item.endpoint_url].lastSuccess = item.last_success_at;
    }
    if (item.last_failure_at && (!acc[item.endpoint_url].lastFailure || item.last_failure_at > acc[item.endpoint_url].lastFailure!)) {
      acc[item.endpoint_url].lastFailure = item.last_failure_at;
    }
    return acc;
  }, {} as Record<string, any>);

  const endpoints = Object.values(endpointHealth || {});

  const isLoading = dlqLoading || statsLoading;

  if (isLoading || rechartsLoading || !recharts) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = recharts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('webhooks.webhookReliabilityDashboard.webhookReliability')}</h2>
          <p className="text-muted-foreground">{t('webhooks.webhookReliabilityDashboard.monitorWebhookDeliveryHealthAndManage')}</p>
        </div>
        <Badge variant={parseFloat(successRate) >= 99 ? "secondary" : parseFloat(successRate) >= 95 ? "outline" : "destructive"}>
          {successRate}% Success Rate
        </Badge>
      </div>

      {/* Alert for critical failures */}
      {failedCount > 10 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {failedCount} webhooks have permanently failed. Review and take action in the Dead Letter Queue.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('webhooks.webhookReliabilityDashboard.totalDeliveries')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeliveries.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{t('webhooks.webhookReliabilityDashboard.last7Days')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('webhooks.webhookReliabilityDashboard.successful')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{successfulDeliveries.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{successRate}% success rate</p>
          </CardContent>
        </Card>

        <Card className={pendingCount > 0 ? "border-warning/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('webhooks.webhookReliabilityDashboard.pendingRetry')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">{t('webhooks.webhookReliabilityDashboard.inDeadLetterQueue')}</p>
          </CardContent>
        </Card>

        <Card className={failedCount > 0 ? "border-destructive/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('webhooks.webhookReliabilityDashboard.failed')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{failedCount}</div>
            <p className="text-xs text-muted-foreground">{t('webhooks.webhookReliabilityDashboard.maxRetriesExceeded')}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="health">
        <TabsList>
          <TabsTrigger value="health">{t('webhooks.webhookReliabilityDashboard.endpointHealth')}</TabsTrigger>
          <TabsTrigger value="dlq">Dead Letter Queue ({dlqItems?.length || 0})</TabsTrigger>
          <TabsTrigger value="trends">{t('webhooks.webhookReliabilityDashboard.trends')}</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t('webhooks.webhookReliabilityDashboard.endpointHealthStatus')}</CardTitle>
              <CardDescription>{t('webhooks.webhookReliabilityDashboard.deliverySuccessRatePerWebhookEndpoint')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('webhooks.webhookReliabilityDashboard.endpoint')}</TableHead>
                      <TableHead className="text-right">{t('webhooks.webhookReliabilityDashboard.deliveries')}</TableHead>
                      <TableHead className="text-right">{t('webhooks.webhookReliabilityDashboard.successRate')}</TableHead>
                      <TableHead className="text-right">{t('webhooks.webhookReliabilityDashboard.avgResponse')}</TableHead>
                      <TableHead className="text-right">{t('common:fields.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {endpoints.map((endpoint: any, idx) => {
                      const rate = endpoint.total ? (endpoint.success / endpoint.total) * 100 : 100;
                      const isHealthy = rate >= 99;
                      const isDegraded = rate >= 95 && rate < 99;

                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-sm truncate max-w-[250px]">
                            {endpoint.endpoint}
                          </TableCell>
                          <TableCell className="text-right">{endpoint.total}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={isHealthy ? "secondary" : isDegraded ? "outline" : "destructive"}>
                              {rate.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {endpoint.avgResponseTime ? `${endpoint.avgResponseTime}ms` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {isHealthy ? (
                              <CheckCircle className="h-4 w-4 text-primary inline" />
                            ) : isDegraded ? (
                              <AlertTriangle className="h-4 w-4 text-warning inline" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive inline" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dlq" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">{t('webhooks.webhookReliabilityDashboard.deadLetterQueue')}</CardTitle>
                  <CardDescription>{t('webhooks.webhookReliabilityDashboard.failedWebhookDeliveriesAwaitingAction')}</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['webhook-dlq'] })}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('webhooks.webhookReliabilityDashboard.endpoint')}</TableHead>
                      <TableHead>{t('common:fields.status')}</TableHead>
                      <TableHead>{t('common:status.error')}</TableHead>
                      <TableHead className="text-right">{t('webhooks.webhookReliabilityDashboard.retries')}</TableHead>
                      <TableHead className="text-right">{t('webhooks.webhookReliabilityDashboard.created')}</TableHead>
                      <TableHead className="text-right">{t('common:fields.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dlqItems?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm truncate max-w-[200px]">
                          {item.endpoint_url}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'pending' ? "outline" : "destructive"}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                          {item.error_message || `HTTP ${item.http_status}`}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.retry_count}/{item.max_retries}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {format(new Date(item.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedItem(item)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>{t('webhooks.webhookReliabilityDashboard.webhookPayload')}</DialogTitle>
                                </DialogHeader>
                                <ScrollArea className="h-[400px]">
                                  <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                                    {JSON.stringify(selectedItem?.payload, null, 2)}
                                  </pre>
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => retryMutation.mutate(item.id)}
                              disabled={retryMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {dlqItems?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
                          No failed webhooks in queue
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t('webhooks.webhookReliabilityDashboard.deliveryTrends')}</CardTitle>
              <CardDescription>{t('webhooks.webhookReliabilityDashboard.successVsFailedDeliveriesOverTime')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="success" fill="hsl(var(--primary))" name="Success" stackId="a" />
                  <Bar dataKey="failed" fill="hsl(var(--destructive))" name="Failed" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
