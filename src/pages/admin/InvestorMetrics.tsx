import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target, 
  RefreshCw,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Briefcase,
  BarChart3,
  Percent
} from "lucide-react";
import { 
  useLatestInvestorMetrics, 
  useInvestorMetricsHistory, 
  useCaptureInvestorSnapshot,
  useValuationMetrics,
  formatCurrencyCompact
} from "@/hooks/useInvestorMetrics";
import { toast } from "sonner";

export default function InvestorMetrics() {
  const { data: latest, isLoading } = useLatestInvestorMetrics();
  const { data: history } = useInvestorMetricsHistory(90);
  const { mutate: captureSnapshot, isPending: isCapturing } = useCaptureInvestorSnapshot();
  const valuation = useValuationMetrics();

  const handleRefresh = () => {
    captureSnapshot('daily', {
      onSuccess: () => toast.success('Investor metrics refreshed'),
      onError: (err) => toast.error(`Refresh failed: ${err.message}`),
    });
  };

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin']} showLoading>
        <div className="container mx-auto py-8 px-4">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <BarChart3 className="h-8 w-8 text-primary" />
                Investor Metrics
              </h1>
              <p className="text-muted-foreground">
                Due diligence ready metrics for $100M+ valuation
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={isCapturing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isCapturing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Valuation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Valuation @ 5x ARR
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <p className="text-3xl font-bold">{formatCurrencyCompact(valuation.valuationAt5xARR)}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Conservative SaaS multiple</p>
              </CardContent>
            </Card>

            <Card className="border-success/20 bg-gradient-to-br from-success/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Valuation @ 10x ARR
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <p className="text-3xl font-bold text-success">{formatCurrencyCompact(valuation.valuationAt10xARR)}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Growth SaaS multiple</p>
              </CardContent>
            </Card>

            <Card className="border-warning/20 bg-gradient-to-br from-warning/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Valuation @ 15x ARR
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <p className="text-3xl font-bold text-warning">{formatCurrencyCompact(valuation.valuationAt15xARR)}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Premium SaaS multiple</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Annual Recurring Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <p className="text-2xl font-bold">{formatCurrency(valuation.arr)}</p>
                    {valuation.growthYoY !== null && (
                      <div className="flex items-center gap-1 mt-1">
                        {valuation.growthYoY >= 0 ? (
                          <ArrowUpRight className="h-4 w-4 text-success" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-destructive" />
                        )}
                        <span className={valuation.growthYoY >= 0 ? 'text-success' : 'text-destructive'}>
                          {formatPercent(valuation.growthYoY)} YoY
                        </span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Monthly Recurring Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <p className="text-2xl font-bold">{formatCurrency(valuation.mrr)}</p>
                    {valuation.growthMoM !== null && (
                      <div className="flex items-center gap-1 mt-1">
                        {valuation.growthMoM >= 0 ? (
                          <ArrowUpRight className="h-4 w-4 text-success" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-destructive" />
                        )}
                        <span className={valuation.growthMoM >= 0 ? 'text-success' : 'text-destructive'}>
                          {formatPercent(valuation.growthMoM)} MoM
                        </span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Revenue YTD
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-2xl font-bold">{formatCurrency(valuation.revenueYTD)}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Collected revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Pipeline Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <p className="text-2xl font-bold">{formatCurrency(valuation.pipelineValue)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Weighted: {formatCurrencyCompact(valuation.weightedPipeline)}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Customer & Unit Economics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Customer Metrics
                </CardTitle>
                <CardDescription>Active customers and retention</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                  <p className="text-2xl font-bold">{latest?.total_customers || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active (12mo)</p>
                  <p className="text-2xl font-bold">{latest?.active_customers || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Revenue Retention</p>
                  <p className="text-2xl font-bold">
                    {latest?.net_revenue_retention 
                      ? `${(latest.net_revenue_retention * 100).toFixed(0)}%` 
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Logo Retention</p>
                  <p className="text-2xl font-bold">
                    {latest?.logo_retention 
                      ? `${(latest.logo_retention * 100).toFixed(0)}%` 
                      : '—'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Unit Economics
                </CardTitle>
                <CardDescription>LTV, CAC, and payback period</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">LTV</p>
                  <p className="text-2xl font-bold">
                    {valuation.ltv ? formatCurrency(valuation.ltv) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CAC</p>
                  <p className="text-2xl font-bold">
                    {valuation.cac ? formatCurrency(valuation.cac) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">LTV:CAC Ratio</p>
                  <p className="text-2xl font-bold">
                    {valuation.ltvCacRatio ? `${valuation.ltvCacRatio.toFixed(1)}x` : '—'}
                  </p>
                  {valuation.ltvCacRatio && valuation.ltvCacRatio >= 3 && (
                    <Badge variant="outline" className="text-success border-success mt-1">
                      Healthy
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rule of 40</p>
                  <p className="text-2xl font-bold">
                    {valuation.ruleOf40 !== null ? valuation.ruleOf40.toFixed(0) : '—'}
                  </p>
                  {valuation.ruleOf40 !== null && valuation.ruleOf40 >= 40 && (
                    <Badge variant="outline" className="text-success border-success mt-1">
                      Passing
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Metrics */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Product Metrics
              </CardTitle>
              <CardDescription>Platform usage and engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{latest?.total_users || 0}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Candidates</p>
                  <p className="text-2xl font-bold">{latest?.total_candidates || 0}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Applications</p>
                  <p className="text-2xl font-bold">{latest?.total_applications || 0}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Placements</p>
                  <p className="text-2xl font-bold text-success">{latest?.total_placements || 0}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Placement Rate</p>
                  <p className="text-2xl font-bold">
                    {latest?.placement_rate 
                      ? `${(latest.placement_rate * 100).toFixed(1)}%` 
                      : '—'}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Avg Deal Size</p>
                  <p className="text-2xl font-bold">
                    {latest?.avg_deal_size ? formatCurrencyCompact(latest.avg_deal_size) : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Snapshot Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Last snapshot: {latest?.snapshot_date 
                    ? new Date(latest.snapshot_date).toLocaleDateString('nl-NL', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    : 'Never'}
                </span>
                <span>{history?.length || 0} historical snapshots</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
