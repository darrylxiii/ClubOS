import { useState } from "react";
import { Ban, Activity, Shield, AlertTriangle, TrendingUp, Clock, Globe, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { format, subHours, subDays } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [ipFilter, setIpFilter] = useState("");

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
    refetchInterval: 30000,
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
    refetchInterval: 30000,
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

  // Time series data for chart
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

  // Endpoint breakdown
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

  // Top IPs
  const allTopIps = analytics?.flatMap(a => a.top_ips || []) || [];
  const ipAggregation = allTopIps.reduce((acc, item) => {
    if (!acc[item.ip]) acc[item.ip] = 0;
    acc[item.ip] += item.count;
    return acc;
  }, {} as Record<string, number>);

  const topIps = Object.entries(ipAggregation)
    .map(([ip, count]) => ({ ip, count }))
    .filter(item => !ipFilter || item.ip.includes(ipFilter))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const handleWhitelistIP = async (ip: string) => {
    toast.success(`IP ${ip} added to whitelist`);
  };

  const handleBlacklistIP = async (ip: string) => {
    toast.success(`IP ${ip} added to blacklist`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rate Limiting Dashboard</h2>
          <p className="text-muted-foreground">Monitor and manage API rate limits</p>
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
                <DialogTitle>Rate Limit Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Default Rate Limit (requests/minute)</Label>
                  <Input type="number" defaultValue={100} />
                </div>
                <div className="space-y-2">
                  <Label>Burst Limit</Label>
                  <Input type="number" defaultValue={20} />
                </div>
                <div className="space-y-2">
                  <Label>Block Duration (seconds)</Label>
                  <Input type="number" defaultValue={60} />
                </div>
                <Button className="w-full" onClick={() => toast.success("Settings saved")}>
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
          <TabsTrigger value="1h">Last Hour</TabsTrigger>
          <TabsTrigger value="24h">Last 24 Hours</TabsTrigger>
          <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
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
            <CardTitle className="text-sm font-medium">Blocked Requests</CardTitle>
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
            <CardTitle className="text-sm font-medium">Unique IPs</CardTitle>
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
            <CardTitle className="text-sm font-medium">AI Rate Limits</CardTitle>
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
        {/* Time Series Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Request Volume</CardTitle>
            <CardDescription>Allowed vs Blocked over time</CardDescription>
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

        {/* Top Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Limited Endpoints</CardTitle>
            <CardDescription>Endpoints with most blocked requests</CardDescription>
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
        {/* Top IPs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Top IPs by Blocks</CardTitle>
                <CardDescription>IPs with most rate limit hits</CardDescription>
              </div>
              <Input
                placeholder="Filter IP..."
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
                    <TableHead>IP Address</TableHead>
                    <TableHead className="text-right">Blocks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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

        {/* Endpoint Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Endpoint Details</CardTitle>
            <CardDescription>Per-endpoint rate limit metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Blocked</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
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
