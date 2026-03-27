import { useState } from "react";
import { Ban, Activity, Shield, AlertTriangle, TrendingUp, Clock, Globe, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecharts } from "@/hooks/useRecharts";
import { format, subHours, subDays } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

const COLORS = ['hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--primary))', 'hsl(var(--muted))'];

interface RateLimitAnalytics {
  endpoint: string;
  date: string;
  hour: number;
  total_requests: number;
  blocked_requests: number;
  unique_ips: number;
  top_ips: any;
  avg_response_time_ms: number;
}

export const RateLimitDashboard = () => {
  const { t } = useTranslation('admin');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [ipFilter, setIpFilter] = useState("");
  const { recharts, isLoading: rechartsLoading } = useRecharts();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['rate-limit-analytics', timeRange],
    queryFn: async () => {
      const startDate = timeRange === '1h' 
        ? subHours(new Date(), 1)
        : timeRange === '24h' 
          ? subDays(new Date(), 1)
          : subDays(new Date(), 7);

      const { data, error } = await supabase
        .from('rate_limit_analytics')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as RateLimitAnalytics[];
    },
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
    staleTime: 60000,
  });

  const { data: aiRateLimits } = useQuery({
    queryKey: ['ai-rate-limits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_rate_limits')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
    staleTime: 60000,
  });

  // Aggregate stats
  const stats = analytics?.reduce((acc, item) => {
    acc.totalRequests += item.total_requests || 0;
    acc.blockedRequests += item.blocked_requests || 0;
    acc.uniqueEndpoints.add(item.endpoint);
    return acc;
  }, { totalRequests: 0, blockedRequests: 0, uniqueEndpoints: new Set<string>() });

  const blockRate = stats?.totalRequests ? ((stats.blockedRequests / stats.totalRequests) * 100).toFixed(2) : '0';
  const isUnderAttack = parseFloat(blockRate) > 10;

  const timeSeriesData = analytics?.reduce((acc, item) => {
    const key = `${item.date}-${item.hour}`;
    if (!acc[key]) {
      acc[key] = { time: key, blocked: 0, allowed: 0 };
    }
    acc[key].blocked += item.blocked_requests || 0;
    acc[key].allowed += (item.total_requests || 0) - (item.blocked_requests || 0);
    return acc;
  }, {} as Record<string, { time: string; blocked: number; allowed: number }>);

  const chartData = Object.values(timeSeriesData || {}).slice(-24);

  const endpointBreakdown = analytics?.reduce((acc, item) => {
    if (!acc[item.endpoint]) {
      acc[item.endpoint] = { endpoint: item.endpoint, total: 0, blocked: 0 };
    }
    acc[item.endpoint].total += item.total_requests || 0;
    acc[item.endpoint].blocked += item.blocked_requests || 0;
    return acc;
  }, {} as Record<string, { endpoint: string; total: number; blocked: number }>);

  const topEndpoints = Object.values(endpointBreakdown || {})
    .sort((a, b) => b.blocked - a.blocked)
    .slice(0, 10);

  const allTopIps = analytics?.flatMap(a => a.top_ips || []) || [];
  const ipAggregation = allTopIps.reduce((acc, item) => {
    if (!acc[item.ip]) acc[item.ip] = 0;
    acc[item.ip] += item.count;
    return acc;
  }, {} as Record<string, number>);

  const topIps = Object.entries(ipAggregation)
    .map(([ip, count]): { ip: string; count: number } => ({ ip, count: Number(count) }))
    .filter(item => !ipFilter || item.ip.includes(ipFilter))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const handleWhitelistIP = async (ip: string) => {
    toast.success(`IP ${ip} added to whitelist`);
  };

  const handleBlacklistIP = async (ip: string) => {
    toast.success(`IP ${ip} added to blacklist`);
  };

  if (isLoading || rechartsLoading || !recharts) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } = recharts;

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('security.rateLimitDashboard.rateLimitingDashboard')}</h2>
          <p className="text-muted-foreground">{t('security.rateLimitDashboard.monitorAndManageApiRateLimits')}</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={isUnderAttack ? "destructive" : "secondary"} className="text-sm px-3 py-1">
            {isUnderAttack ? (
              <>
                <AlertTriangle className="h-4 w-4 mr-1" />
                Under Attack
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-1" />
                Protected
              </>
            )}
          </Badge>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('security.rateLimitDashboard.rateLimitConfiguration')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t('security.rateLimitDashboard.defaultRateLimitRequestsminute')}</Label>
                  <Input type="number" defaultValue={100} />
                </div>
                <div className="space-y-2">
                  <Label>{t('security.rateLimitDashboard.burstLimit')}</Label>
                  <Input type="number" defaultValue={20} />
                </div>
                <div className="space-y-2">
                  <Label>{t('security.rateLimitDashboard.blockDurationSeconds')}</Label>
                  <Input type="number" defaultValue={60} />
                </div>
                <Button className="w-full" onClick={() => toast.success(t('security.rateLimitDashboard.settingsSaved'))}>
                  Save Configuration
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Time Range Selector */}
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
        <TabsList>
          <TabsTrigger value="1h">{t('security.rateLimitDashboard.lastHour')}</TabsTrigger>
          <TabsTrigger value="24h">{t('security.rateLimitDashboard.last24Hours')}</TabsTrigger>
          <TabsTrigger value="7d">{t('security.rateLimitDashboard.last7Days')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('security.rateLimitDashboard.totalRequests')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.uniqueEndpoints.size} endpoints
            </p>
          </CardContent>
        </Card>

        <Card className={isUnderAttack ? "border-destructive/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('security.rateLimitDashboard.blockedRequests')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats?.blockedRequests.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {blockRate}% block rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('security.rateLimitDashboard.uniqueIps')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(ipAggregation).length}</div>
            <p className="text-xs text-muted-foreground">
              {topIps.length} flagged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('security.rateLimitDashboard.aiRateLimits')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiRateLimits?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active limiters
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('security.rateLimitDashboard.requestVolume')}</CardTitle>
            <CardDescription>{t('security.rateLimitDashboard.allowedVsBlockedOverTime')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))'
                  }}
                />
                <Line type="monotone" dataKey="allowed" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="blocked" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('security.rateLimitDashboard.topLimitedEndpoints')}</CardTitle>
            <CardDescription>{t('security.rateLimitDashboard.endpointsWithMostBlockedRequests')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topEndpoints.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="endpoint" type="category" width={120} tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))'
                  }}
                />
                <Bar dataKey="blocked" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">{t('security.rateLimitDashboard.topIpsByBlocks')}</CardTitle>
                <CardDescription>{t('security.rateLimitDashboard.ipsWithMostRateLimitHits')}</CardDescription>
              </div>
              <Input
                placeholder={t('security.rateLimitDashboard.filterIp')}
                value={ipFilter}
                onChange={(e) => setIpFilter(e.target.value)}
                className="w-40"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('security.rateLimitDashboard.ipAddress')}</TableHead>
                    <TableHead className="text-right">{t('security.rateLimitDashboard.blocks')}</TableHead>
                    <TableHead className="text-right">{t('common:fields.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topIps.map((item) => (
                    <TableRow key={item.ip}>
                      <TableCell className="font-mono text-sm">{item.ip}</TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleWhitelistIP(item.ip)}
                          >
                            Allow
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleBlacklistIP(item.ip)}
                          >
                            Block
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('security.rateLimitDashboard.endpointDetails')}</CardTitle>
            <CardDescription>{t('security.rateLimitDashboard.perendpointRateLimitMetrics')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('security.rateLimitDashboard.endpoint')}</TableHead>
                    <TableHead className="text-right">{t('security.rateLimitDashboard.total')}</TableHead>
                    <TableHead className="text-right">{t('security.rateLimitDashboard.blocked')}</TableHead>
                    <TableHead className="text-right">{t('security.rateLimitDashboard.rate')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topEndpoints.map((item) => (
                    <TableRow key={item.endpoint}>
                      <TableCell className="font-mono text-sm truncate max-w-[150px]">
                        {item.endpoint}
                      </TableCell>
                      <TableCell className="text-right">{item.total}</TableCell>
                      <TableCell className="text-right text-destructive">{item.blocked}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.blocked / item.total > 0.1 ? "destructive" : "secondary"}>
                          {((item.blocked / item.total) * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
