import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Database, 
  Zap,
  AlertTriangle,
  CheckCircle,
  HardDrive,
  Bot,
  Mail,
  Shield
} from 'lucide-react';
import { useCostMetrics } from '@/hooks/useCostMetrics';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function formatCurrency(amount: number): string {
  return `€${amount.toFixed(2)}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function CostOverview() {
  const { 
    costSummary, 
    cronJobs, 
    storageMetrics, 
    budgetAlerts, 
    aiUsageByFunction,
    isLoading 
  } = useCostMetrics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cost Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Daily Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {formatCurrency(costSummary?.dailyEstimate || 0)}
              </span>
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                <TrendingDown className="h-3 w-3 mr-1" />
                Optimal
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on last 24h usage patterns
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Weekly Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {formatCurrency(costSummary?.weeklyEstimate || 0)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              7-day projected cost
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Monthly Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {formatCurrency(costSummary?.monthlyEstimate || 0)}
              </span>
              {(costSummary?.monthlyEstimate || 0) < 100 && (
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                  Under budget
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              30-day projected cost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Budget Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {budgetAlerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={alert.type === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.type}
                  </Badge>
                  <span className="text-sm">{alert.message}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={Math.min(alert.percentageUsed, 100)} className="w-24 h-2" />
                  <span className="text-xs text-muted-foreground">
                    {alert.percentageUsed.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Detailed Tabs */}
      <Tabs defaultValue="breakdown" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
          <TabsTrigger value="cron">Cron Jobs</TabsTrigger>
          <TabsTrigger value="ai">AI Usage</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-4">
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Monthly Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {costSummary?.breakdown.map(item => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.category === 'AI & ML' && <Bot className="h-4 w-4 text-purple-500" />}
                      {item.category === 'Cron Jobs' && <Clock className="h-4 w-4 text-blue-500" />}
                      {item.category === 'Storage' && <HardDrive className="h-4 w-4 text-amber-500" />}
                      {item.category === 'Database' && <Database className="h-4 w-4 text-emerald-500" />}
                      <span className="text-sm font-medium">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                      <span className="text-xs text-muted-foreground">
                        ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cron" className="space-y-4">
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Cron Job Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cronJobs.map(job => (
                  <div 
                    key={job.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Zap className={cn(
                          "h-4 w-4",
                          job.status === 'active' ? 'text-emerald-500' : 'text-muted-foreground'
                        )} />
                        <span className="font-medium text-sm">{job.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {job.schedule}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {job.costDriver} • {job.executionsPerDay} runs/day
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {formatCurrency(job.estimatedDailyCost)}/day
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(job.estimatedDailyCost * 30)}/mo
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle className="text-base">AI Function Usage (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(aiUsageByFunction)
                  .sort(([, a], [, b]) => b.dailyCount - a.dailyCount)
                  .slice(0, 10)
                  .map(([fn, data]) => (
                    <div 
                      key={fn}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-purple-500" />
                          <span className="font-medium text-sm">
                            {fn.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {data.tokens.toLocaleString()} tokens used
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{data.dailyCount} calls</p>
                        <p className="text-xs text-muted-foreground">
                          ≈ {formatCurrency(data.dailyCount * 0.01)}/day
                        </p>
                      </div>
                    </div>
                  ))}
                {Object.keys(aiUsageByFunction).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    <p>No AI function calls in the last 24 hours</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Storage Buckets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {storageMetrics.map(bucket => (
                  <div 
                    key={bucket.bucketName}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-amber-500" />
                        <span className="font-medium text-sm">{bucket.bucketName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {bucket.fileCount} files
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{formatBytes(bucket.sizeBytes)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(bucket.estimatedMonthlyCost)}/mo
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cost Optimization Tips */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-card/60 backdrop-blur-xl border-emerald-500/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-500" />
            Cost Optimization Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
              <span className="line-through text-muted-foreground">Reduce <code className="bg-muted px-1 rounded">region-health-check</code> frequency from every minute to every 5 minutes</span>
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 ml-2">Done</Badge>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
              <span>Add cleanup job for <code className="bg-muted px-1 rounded">webrtc_signals</code> table (currently growing fast)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
              <span>Cache AI responses for repeated queries to reduce API calls</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
              <span>Review meeting recordings - consider auto-cleanup after 90 days</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
