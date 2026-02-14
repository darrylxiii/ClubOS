import { useInvestorMetrics } from "@/hooks/useInvestorMetrics";
import { ARRTracker } from "@/components/admin/revenue/ARRTracker";
import { RevenueDistributionSummary } from "@/components/admin/revenue/RevenueDistributionSummary";
import { RevenueCohortAnalysis } from "@/components/financial/RevenueCohortAnalysis";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, TrendingUp, Users, Target, 
  Download, RefreshCw, PieChart 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function RevenueDashboard() {
  const { data: metrics, isLoading, refetch } = useInvestorMetrics();

  const handleCaptureSnapshot = async () => {
    try {
      const { error } = await supabase.rpc('capture_investor_metrics_snapshot');
      if (error) throw error;
      toast.success('Investor metrics snapshot captured');
      refetch();
    } catch (error) {
      console.error('Snapshot error:', error);
      toast.error('Failed to capture snapshot');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revenue Dashboard</h1>
          <p className="text-muted-foreground">Track ARR, MRR, and revenue metrics for due diligence</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCaptureSnapshot}>
            <Download className="h-4 w-4 mr-2" />
            Capture Snapshot
          </Button>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="arr">ARR Tracking</TabsTrigger>
          <TabsTrigger value="distribution">Revenue Distribution</TabsTrigger>
          <TabsTrigger value="cohorts">Cohort Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Revenue (YTD)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <p className="text-2xl font-bold">
                      €{((metrics?.total_revenue || 0) / 1000).toFixed(0)}K
                    </p>
                    <Badge variant="outline" className="mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {metrics?.revenue_growth?.toFixed(1) || 0}% growth
                    </Badge>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Active Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <p className="text-2xl font-bold">{metrics?.active_customers || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {metrics?.total_candidates || 0} candidates
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Total Placements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <p className="text-2xl font-bold">{metrics?.total_placements || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      €{((metrics?.placement_revenue || 0) / 1000).toFixed(0)}K revenue
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Net Revenue Retention
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <p className="text-2xl font-bold">
                      {(metrics?.net_revenue_retention || 100).toFixed(0)}%
                    </p>
                    <Badge 
                      variant={(metrics?.net_revenue_retention || 100) >= 100 ? "default" : "destructive"}
                      className="mt-1"
                    >
                      {(metrics?.net_revenue_retention || 100) >= 100 ? 'Healthy' : 'Needs attention'}
                    </Badge>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Valuation Metrics */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Valuation Indicators
              </CardTitle>
              <CardDescription>Key metrics for $100M+ valuation readiness</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Target ARR for $100M (10x multiple)</p>
                  <p className="text-xl font-bold">€10M</p>
                  <p className="text-xs text-muted-foreground">
                    Current: €{((metrics?.total_revenue || 0) * 12 / new Date().getMonth() / 1000000).toFixed(2)}M projected
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Target Customers</p>
                  <p className="text-xl font-bold">100+</p>
                  <p className="text-xs text-muted-foreground">
                    Current: {metrics?.active_customers || 0} ({((metrics?.active_customers || 0) / 100 * 100).toFixed(0)}%)
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Target Candidates</p>
                  <p className="text-xl font-bold">10,000+</p>
                  <p className="text-xs text-muted-foreground">
                    Current: {metrics?.total_candidates || 0} ({((metrics?.total_candidates || 0) / 10000 * 100).toFixed(1)}%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="arr">
          <ARRTracker />
        </TabsContent>

        <TabsContent value="distribution">
          <RevenueDistributionSummary />
        </TabsContent>

        <TabsContent value="cohorts">
          <RevenueCohortAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
